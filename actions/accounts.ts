"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { Account, Transaction } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { revalidatePath } from "next/cache";

type AccountWithTransactions = Account & {
  transactions: Transaction[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeAccount = (obj: any) => {
  const serialized = { ...obj };

  if (obj.balance) {
    serialized.balance = (obj.balance as Decimal).toNumber();
  }
  if (obj.amount) {
    serialized.amount = (obj.amount as Decimal).toNumber();
  }
  return serialized;
};

export const updateDefaultAccount = async (accountId: string) => {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

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
        id: accountId,
        userId: user.id,
      },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    await db.account.updateMany({
      where: {
        userId: user.id,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    await db.account.update({
      where: {
        id: accountId,
      },
      data: {
        isDefault: true,
      },
    });

    revalidatePath("/dashboard");

    return {
      success: true,
      account: serializeAccount(account),
    };
  } catch (error) {
    console.error(error);
    throw new Error("Failed to update default account");
  }
};

export const getAccount = async (
  accountId: string
): Promise<AccountWithTransactions | null> => {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

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
        id: accountId,
        userId: user.id,
      },
      include: {
        transactions: {
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });

    if (!account) {
      return null;
    }

    return {
      ...serializeAccount(account),
      transactions: account.transactions.map(serializeAccount),
    };
  } catch (error) {
    console.error(error);
    throw new Error("Failed to get account");
  }
};

export const bulkDeleteTransactions = async (transactionIds: string[]) => {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const transactions = await db.transaction.findMany({
      where: {
        id: {
          in: transactionIds,
        },
        userId: user.id,
      },
    });

    const accountBalanceChanges = transactions.reduce((acc, transaction) => {
      const change =
        transaction.type === "EXPENSE"
          ? transaction.amount
          : -transaction.amount;

      acc[transaction.accountId] =
        (acc[transaction.accountId] || 0) + parseFloat(change.toString());
      return acc;
    }, {} as Record<string, number>);

    await db.$transaction(async (tx) => {
      await tx.transaction.deleteMany({
        where: {
          id: { in: transactionIds },
          userId: user.id,
        },
      });

      for (const [accountId, change] of Object.entries(accountBalanceChanges)) {
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { increment: change as number } },
        });
      }
    });

    revalidatePath("/dashboard", "page");
    revalidatePath("/account/[id]", "page");

    return {
      success: true,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: "Failed to bulk delete transactions",
    };
  }
};
