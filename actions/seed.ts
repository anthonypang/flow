"use server";

import { db } from "@/lib/prisma";
import {
  Transaction,
  TransactionType,
  Prisma,
  TransactionStatus,
} from "@prisma/client";
import { subDays } from "date-fns";

const ACCOUNT_ID = "bcca19eb-f47a-4d80-9371-62c25eeec161";
const USER_ID = "7d0414b3-e3d2-4740-a302-c092357d8267";

// Categories with their typical amount ranges
const CATEGORIES = {
  INCOME: [
    { name: "salary", range: [5000, 8000] },
    { name: "freelance", range: [1000, 3000] },
    { name: "investments", range: [500, 2000] },
    { name: "other-income", range: [100, 1000] },
  ],
  EXPENSE: [
    { name: "housing", range: [1000, 2000] },
    { name: "transportation", range: [100, 500] },
    { name: "groceries", range: [200, 600] },
    { name: "utilities", range: [100, 300] },
    { name: "entertainment", range: [50, 200] },
    { name: "food", range: [50, 150] },
    { name: "shopping", range: [100, 500] },
    { name: "healthcare", range: [100, 1000] },
    { name: "education", range: [200, 1000] },
    { name: "travel", range: [500, 2000] },
  ],
};

// Helper to generate random amount within a range
function getRandomAmount(min: number, max: number) {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

// Helper to get random category with amount
function getRandomCategory(type: "INCOME" | "EXPENSE") {
  const categories = CATEGORIES[type];
  const category = categories[Math.floor(Math.random() * categories.length)];
  const amount = getRandomAmount(category.range[0], category.range[1]);
  return { category: category.name, amount };
}

export async function seedTransactions() {
  try {
    // Generate 90 days of transactions
    const transactions: Transaction[] = [];
    let totalBalance = 0;

    for (let i = 90; i >= 0; i--) {
      const date = subDays(new Date(), i);

      // Generate 1-3 transactions per day
      const transactionsPerDay = Math.floor(Math.random() * 3) + 1;

      for (let j = 0; j < transactionsPerDay; j++) {
        // 40% chance of income, 60% chance of expense
        const type =
          Math.random() < 0.4 ? "INCOME" : ("EXPENSE" as TransactionType);
        const { category, amount } = getRandomCategory(type);

        const transaction = {
          id: crypto.randomUUID(),
          type,
          amount: new Prisma.Decimal(amount),
          description: `${
            type === "INCOME" ? "Received" : "Paid for"
          } ${category}`,
          date,
          category,
          status: "COMPLETED" as TransactionStatus,
          userId: USER_ID,
          accountId: ACCOUNT_ID,
          createdAt: date,
          updatedAt: date,
          receiptUrl: null,
          isRecurring: false,
          recurringInterval: null,
          nextRecurringDate: null,
          lastProcessed: null,
        };

        totalBalance += type === "INCOME" ? amount : -amount;
        transactions.push(transaction);
      }
    }

    // Process in smaller batches
    const BATCH_SIZE = 50;

    // Clear existing transactions first
    await db.transaction.deleteMany({
      where: { accountId: ACCOUNT_ID },
    });

    // Insert transactions in batches
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);
      await db.transaction.createMany({
        data: batch,
      });
    }

    // Update account balance separately
    await db.account.update({
      where: { id: ACCOUNT_ID },
      data: { balance: totalBalance },
    });

    return {
      success: true,
      message: `Created ${transactions.length} transactions`,
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
