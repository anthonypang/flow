import sendEmail from "@/actions/send-email";
import { db } from "@/lib/prisma";
import { inngest } from "./client";
import EmailTemplate from "@/emails/template";
import { startOfMonth, endOfMonth } from "date-fns";
import { Transaction, RecurringInterval } from "@prisma/client";
import { calculateNextRecurringTransactionDate } from "@/actions/transaction";

export const checkBudgetAlerts = inngest.createFunction(
  { name: "Check Budget Alerts", id: "check-budget-alerts" },
  { cron: "0 */6 * * *" }, // Every 6 hours
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ({ step }: { step: any }) => {
    const budgets = await step.run("fetch-budgets", async () => {
      return await db.budget.findMany({
        include: {
          user: {
            include: {
              accounts: {
                where: {
                  isDefault: true,
                },
              },
            },
          },
        },
      });
    });

    for (const budget of budgets) {
      const defaultAccount = budget.user.accounts[0];
      if (!defaultAccount) continue; // Skip if no default account

      await step.run(`check-budget-${budget.id}`, async () => {
        const startDate = new Date();
        startDate.setDate(1); // Start of current month

        // Calculate total expenses for the default account only
        const expenses = await db.transaction.aggregate({
          where: {
            userId: budget.userId,
            type: "EXPENSE",
            accountId: defaultAccount.id,
            date: {
              gte: startOfMonth(startDate),
              lte: endOfMonth(startDate),
            },
          },
          _sum: {
            amount: true,
          },
        });

        const totalExpenses = expenses._sum.amount?.toNumber() || 0;
        const budgetAmount = budget.amount;
        const percentageUsed = (totalExpenses / budgetAmount) * 100;

        // Check if we should send an alert
        if (
          percentageUsed >= 80 && // Default threshold of 80%
          (!budget.lastAlertSent ||
            isNewMonth(new Date(budget.lastAlertSent), new Date()))
        ) {
          await sendEmail({
            to: budget.user.email,
            subject: `Budget Alert for ${defaultAccount.name}`,
            react: EmailTemplate({
              userName: budget.user.name,
              type: "budget-alert",
              data: {
                percentageUsed,
                budgetAmount: parseInt(budgetAmount.toString()),
                totalExpenses: parseInt(totalExpenses.toString()),
                accountName: defaultAccount.name,
              },
            }),
          });

          // Update last alert sent
          await db.budget.update({
            where: { id: budget.id },
            data: { lastAlertSent: new Date() },
          });

          return {
            totalExpenses,
            budgetAmount,
            percentageUsed,
          };
        }
      });
    }
  }
);

function isNewMonth(lastAlertDate: Date, currentDate: Date) {
  return (
    lastAlertDate.getMonth() !== currentDate.getMonth() ||
    lastAlertDate.getFullYear() !== currentDate.getFullYear()
  );
}

export const triggerRecurringTransactions = inngest.createFunction(
  {
    name: "Trigger Recurring Transactions",
    id: "trigger-recurring-transactions",
  },
  { cron: "0 0 * * *" }, // Every day at midnight
  async ({ step }) => {
    // 1. Fetch recurring transactions
    const recurringTransactions = await step.run(
      "fetch-recurring-transactions",
      async () => {
        return await db.transaction.findMany({
          where: {
            isRecurring: true,
            status: "COMPLETED",
            OR: [
              { lastProcessed: null },
              { nextRecurringDate: { lte: new Date() } },
            ],
          },
        });
      }
    );

    // 2. Create events for each transaction
    if (recurringTransactions.length > 0) {
      const events = recurringTransactions.map((transaction) => ({
        name: "transaction.recurring.process",
        data: {
          transactionId: transaction.id,
          userId: transaction.userId,
        },
      }));

      // 3. Send events to inngest
      await inngest.send(events);
    }
    return { triggered: recurringTransactions.length };
  }
);

export const processRecurringTransaction = inngest.createFunction(
  {
    name: "Process Recurring Transaction",
    id: "process-recurring-transaction",
    throttle: {
      limit: 10,
      period: "1m",
      key: "event.data.userId",
    },
  },
  { event: "transaction.recurring.process" },
  async ({ step, event }) => {
    // Validate event data
    const { transactionId, userId } = event.data;
    if (!transactionId || !userId) {
      console.error("Missing transactionId or userId", event.data);
      throw new Error("Missing transactionId or userId");
    }

    await step.run("process-transaction", async () => {
      const transaction = await db.transaction.findUnique({
        where: { id: transactionId, userId },
        include: {
          account: true,
        },
      });

      if (!transaction || !isTransactionDue(transaction)) {
        console.error("Transaction not found", transactionId, userId);
        throw new Error("Transaction not found");
      }

      await db.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            type: transaction.type,
            amount: transaction.amount,
            description: `${transaction.description} (Recurring)`,
            date: new Date(),
            category: transaction.category,
            userId: transaction.userId,
            accountId: transaction.accountId,
            isRecurring: false,
          },
        });

        const balanceChange =
          transaction.type === "EXPENSE"
            ? -transaction.amount
            : transaction.amount;

        await tx.account.update({
          where: { id: transaction.accountId },
          data: { balance: { increment: balanceChange } },
        });

        await tx.transaction.update({
          where: { id: transactionId },
          data: {
            lastProcessed: new Date(),
            nextRecurringDate: calculateNextRecurringTransactionDate(
              new Date(),
              transaction.recurringInterval as RecurringInterval
            ),
          },
        });
      });
    });
  }
);

function isTransactionDue(transaction: Transaction) {
  // If the transaction has never been processed, it's due
  if (!transaction.lastProcessed) return true;

  const today = new Date();
  const nextDue = transaction.nextRecurringDate
    ? new Date(transaction.nextRecurringDate)
    : null;

  // If the transaction is due, return true
  return nextDue && nextDue <= today;
}
