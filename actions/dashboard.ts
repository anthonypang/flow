"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";
import { AccountType } from "@prisma/client";

type Account = {
  name: string;
  balance: Decimal | number | string;
  type: AccountType;
  isDefault: boolean;
};

const serializeAccount = (account: Account) => {
  const serialized = { ...account };
  serialized.balance = (account.balance as Decimal).toNumber();
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
    const balance = parseFloat(account.balance as string);
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
