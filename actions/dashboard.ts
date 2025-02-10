"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";
import { Account, Transaction } from "@prisma/client";

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

export const createAccount = async (account: Account) => {
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

    //convert balance to float
    const balance = parseFloat(account.balance.toString());
    if (isNaN(balance)) {
      throw new Error("Invalid balance");
    }

    //check of this is users first account
    const firstAccount = await db.account.findFirst({
      where: {
        userId: user.id,
      },
    });

    //if this is the first account or specified as default, set it as default
    const shouldSetAsDefault = !firstAccount || account.isDefault;

    if (shouldSetAsDefault) {
      await db.account.updateMany({
        where: {
          userId: user.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    //create account
    const newAccount = await db.account.create({
      data: {
        ...account,
        balance,
        userId: user.id,
        isDefault: shouldSetAsDefault,
      },
    });

    const serializedAccount = serializeAccount(newAccount);

    revalidatePath("/dashboard");

    return {
      success: true,
      account: serializedAccount,
    };
  } catch (error) {
    console.error(error);
    throw new Error("Failed to create account", { cause: error });
  }
};

export const getUserAccounts = async (): Promise<Account[]> => {
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

    const accounts = await db.account.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });

    const serializedAccounts = accounts.map(serializeAccount);

    return serializedAccounts;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to get user accounts", { cause: error });
  }
};

export const getDashboardData = async (): Promise<Transaction[]> => {
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
        userId: user.id,
      },
      orderBy: {
        date: "desc",
      },
    });

    return transactions.map((transaction) => serializeAccount(transaction));
  } catch (error) {
    console.error(error);
    throw new Error("Failed to get dashboard data", { cause: error });
  }
};
