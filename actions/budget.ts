"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { startOfMonth, endOfMonth } from "date-fns";
export const getCurrentBudget = async (accountId: string) => {
  try {
    const { userId } = await auth();

    if (!userId) {
      return null;
    }

    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });

    const budget = await db.budget.findFirst({
      where: {
        userId: user?.id,
      },
    });

    const currentDate = new Date();

    const expenses = await db.transaction.aggregate({
      where: {
        userId: user?.id,
        type: "EXPENSE",
        accountId,
        date: {
          gte: startOfMonth(currentDate),
          lte: endOfMonth(currentDate),
        },
      },
      _sum: {
        amount: true,
      },
    });

    return {
      budget: budget ? { ...budget, amount: budget.amount.toNumber() } : null,
      currentExpenses: expenses._sum.amount
        ? expenses._sum.amount.toNumber()
        : 0,
    };
  } catch (error) {
    console.error(error);
    throw new Error("Failed to get current budget");
  }
};

export const updateBudget = async (amount: number) => {
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

    const budget = await db.budget.upsert({
      where: {
        userId: user.id,
      },
      update: { amount },
      create: { userId: user.id, amount },
    });

    revalidatePath("/dashboard");

    return {
      success: true,
      data: { ...budget, amount: budget.amount.toNumber() },
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: "Failed to update budget",
    };
  }
};
