import { getUserAccounts } from "@/actions/dashboard";
import { defaultCategories } from "@/app/data/categories";
import React from "react";
import AddTransactionForm from "./_components/AddTransactionForm";
import { getTransaction } from "@/actions/transaction";
import { Transaction } from "@prisma/client";

export type TransactionWithNumberAmount = Omit<Transaction, "amount"> & {
  amount: number;
};

type AddTransactionPageProps = {
  searchParams: Promise<{ edit?: string }>;
};

const AddTransactionPage = async ({
  searchParams,
}: AddTransactionPageProps) => {
  const { edit } = await searchParams;
  const accounts = await getUserAccounts();

  const editId = edit;

  let initialData: TransactionWithNumberAmount | null = null;

  if (editId) {
    const transaction = await getTransaction(editId);
    initialData = transaction;
  }

  return (
    <div className="max-w-3xl mx-auto px-5">
      <h1 className="text-5xl gradient-title mb-8">
        {editId ? "Edit Transaction" : "Add Transaction"}
      </h1>

      <AddTransactionForm
        accounts={accounts}
        categories={defaultCategories}
        editMode={!!editId}
        initialData={initialData}
      />
    </div>
  );
};

export default AddTransactionPage;
