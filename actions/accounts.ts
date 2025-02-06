"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { Decimal } from "@prisma/client/runtime/library";
import { revalidatePath } from "next/cache";

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
