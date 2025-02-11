import sendEmail from "@/actions/send-email";
import { db } from "@/lib/prisma";
import { inngest } from "./client";
import EmailTemplate from "@/emails/template";
import { startOfMonth, endOfMonth } from "date-fns";
import { Transaction, RecurringInterval } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type Stats = {
  totalExpenses: number;
  totalIncome: number;
  byCategory: { [key: string]: number };
  transactionCount: number;
};

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
          where: { id: transaction.id },
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

export const calculateNextRecurringTransactionDate = (
  startDate: Date,
  interval: RecurringInterval
) => {
  const date = new Date(startDate);

  switch (interval) {
    case "DAILY":
      date.setDate(date.getDate() + 1);
      break;
    case "WEEKLY":
      date.setDate(date.getDate() + 7);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + 1);
      break;
    case "YEARLY":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date;
};

export const generateMonthlyReports = inngest.createFunction(
  {
    name: "Generate Monthly Reports",
    id: "generate-monthly-reports",
  },
  { cron: "0 0 1 * *" }, // 1st day of the month at midnight
  async ({ step }) => {
    const users = await step.run("fetch-users", async () => {
      return await db.user.findMany({
        include: {
          accounts: true,
        },
      });
    });

    for (const user of users) {
      await step.run(`generate-report-${user.id}`, async () => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const stats = await getMonthlyStats(user.id, lastMonth);
        const monthName = lastMonth.toLocaleString("default", {
          month: "long",
        });

        const insights = await generateFinancialInsights(stats, monthName);

        await sendEmail({
          to: user.email,
          subject: `Monthly Report for ${monthName}`,
          react: EmailTemplate({
            userName: user.name,
            type: "monthly-report",
            data: {
              stats,
              monthName,
              insights,
            },
          }),
        });
      });
    }

    return {
      totalUsersProcessed: users.length,
    };
  }
);

const getMonthlyStats = async (userId: string, month: Date) => {
  const startDate = startOfMonth(month);
  const endDate = endOfMonth(month);

  const transactions = await db.transaction.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  return transactions.reduce(
    (stats, tx) => {
      const amount = tx.amount.toNumber();
      if (tx.type === "EXPENSE") {
        stats.totalExpenses += amount;
        stats.byCategory[tx.category] =
          (stats.byCategory[tx.category] || 0) + amount;
      } else {
        stats.totalIncome += amount;
      }
      return stats;
    },
    {
      totalExpenses: 0,
      totalIncome: 0,
      byCategory: {} as { [key: string]: number },
      transactionCount: transactions.length,
    } as Stats
  );
};

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

const generateFinancialInsights = async (stats: Stats, monthName: string) => {
  const model = gemini.getGenerativeModel({
    model: "gemini-1.5-flash",
  });

  const prompt = `
  Analyze this financial data and provide 3 concise, actionable insights.
  Focus on spending patterns and practical advice.
  Keep it friendly and conversational.

  Financial Data for ${monthName}:
  - Total Income: $${stats.totalIncome}
  - Total Expenses: $${stats.totalExpenses}
  - Net Income: $${stats.totalIncome - stats.totalExpenses}
  - Expense Categories: ${Object.entries(stats.byCategory)
    .map(([category, amount]) => `${category}: $${amount}`)
    .join(", ")}

  Format the response as a JSON array of strings, like this:
  ["insight 1", "insight 2", "insight 3"]
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanedText = text.replace(/^```json\n/, "").replace(/\n```$/, "");
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Error generating financial insights", error);
    return [
      "Your highest expense category this month might need attention.",
      "Consider setting up a budget for better financial management.",
      "Track your recurring expenses to identify potential savings.",
    ];
  }
};
