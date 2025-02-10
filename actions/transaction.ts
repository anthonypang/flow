"use server";

import aj from "@/lib/arcjet";
import { db } from "@/lib/prisma";
import { request } from "@arcjet/next";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@clerk/nextjs/server";
import { RecurringInterval, Transaction } from "@prisma/client";
import { revalidatePath } from "next/cache";

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export const createTransaction = async (transaction: Transaction) => {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Arcjet to add rate limiting
    const req = await request();
    const decision = await aj.protect(req, {
      userId,
      requested: 1,
    });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        const { remaining, reset } = decision.reason;
        throw new Error(
          `Rate limit exceeded. ${remaining} requests remaining until ${reset}`
        );
      } else {
        throw new Error("Request denied");
      }
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

export const scanReceipt = async (file: File) => {
  try {
    const model = gemini.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Convert ArrayBuffer to base64
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const prompt = `
      Analyze this receipt image and extract the following information in JSON format:
      - Total amount (just the number)
      - Date (in ISO format)
      - Description or items purchased (brief summary)
      - Merchant/store name
      - Suggested category (one of: housing,transportation,groceries,utilities,entertainment,food,shopping,healthcare,education,personal,travel,insurance,gifts,bills,other-expense )
      
      Only respond with valid JSON in this exact format:
      {
        "amount": number,
        "date": "ISO date string",
        "description": "string",
        "merchantName": "string",
        "category": "string"
      }

      If its not a recipt, return an empty object
    `;

    const result = await model.generateContent([
      { inlineData: { data: base64, mimeType: file.type } },
      prompt,
    ]);

    const response = await result.response;
    const text = response.text();
    const cleanedText = text.replace(/^```json\n/, "").replace(/\n```$/, "");

    try {
      const json = JSON.parse(cleanedText);

      return {
        amount: parseFloat(json.amount),
        date: new Date(json.date),
        description: json.description,
        merchantName: json.merchantName,
        category: json.category,
      };
    } catch (error) {
      console.error("Error parsing JSON from Gemini", error);
      throw new Error("Invalid JSON from Gemini");
    }
  } catch (error) {
    console.error("Error scanning receipt", error);
    throw new Error("Error scanning receipt");
  }
};

export const getTransaction = async (id: string) => {
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

  const transaction = await db.transaction.findUnique({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  return serializeTransaction(transaction);
};

export const updateTransaction = async (
  id: string,
  transaction: Transaction
) => {
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

    const originalTransaction = await db.transaction.findUnique({
      where: { id, userId: user.id },
      include: { account: true },
    });

    if (!originalTransaction) {
      throw new Error("Transaction not found");
    }

    const updatedTransaction = await db.transaction.update({
      where: { id, userId: user.id },
      data: transaction,
    });

    const oldBalanceChange =
      originalTransaction.type === "INCOME"
        ? Number(originalTransaction.amount)
        : -Number(originalTransaction.amount);

    const newBalanceChange =
      updatedTransaction.type === "INCOME"
        ? Number(updatedTransaction.amount)
        : -Number(updatedTransaction.amount);

    const balanceChange = newBalanceChange - oldBalanceChange;

    const prismaTransaction = await db.$transaction(async (tx) => {
      const updatedTransaction = await tx.transaction.update({
        where: { id, userId: user.id },
        data: {
          ...transaction,
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
        where: { id: transaction.accountId },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      });

      return updatedTransaction;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${transaction.accountId}`);

    return { success: true, data: serializeTransaction(prismaTransaction) };
  } catch (error) {
    throw new Error((error as Error).message);
  }
};
