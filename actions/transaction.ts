"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { RecurringInterval, Transaction } from "@prisma/client";
import { revalidatePath } from "next/cache";
export const createTransaction = async (transaction: Transaction) => {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Arcjet to add rate limiting

    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const account = await db.account.findUnique({
      where: {
        id: transaction.accountId,
        userId: user.id,
      },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    const newBalance =
      transaction.type === "INCOME"
        ? account.balance.plus(transaction.amount)
        : account.balance.minus(transaction.amount);

    const prismaTransaction = await db.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          ...transaction,
          userId: user.id,
          nextRecurringDate:
            transaction.isRecurring && transaction.recurringInterval
              ? calculateNextRecurringTransactionDate(
                  transaction.date,
                  transaction.recurringInterval
                )
              : null,
        },
      });

      await tx.account.update({
        where: { id: account.id },
        data: { balance: newBalance },
      });

      return newTransaction;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${prismaTransaction.accountId}`);

    return { success: true, data: serializeTransaction(prismaTransaction) };
  } catch (error) {
    throw new Error((error as Error).message);
  }
};

const serializeTransaction = (transaction: Transaction) => {
  return {
    ...transaction,
    amount: transaction.amount.toNumber(),
  };
};

const calculateNextRecurringTransactionDate = (
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
