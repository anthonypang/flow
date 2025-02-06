import { getAccount } from "@/actions/accounts";
import NotFound from "@/app/not-found";
import React from "react";

const AccountPage = async ({ params }: { params: { id: string } }) => {
  const { id } = await params;

  const account = await getAccount(id);

  if (!account) {
    return <NotFound />;
  }

  const { name, type, balance, transactions } = account;

  return (
    <div className="space-y-8 px-5 flex gap-4 items-end justify-between">
      <div className="">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight gradient-title capitalize">
          {name}
        </h1>
        <p className="text-muted-foreground">
          {type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()} Account
        </p>
      </div>
      <div className="text-right pb-2">
        <div className="text-xl sm:text-2xl font-bold">
          {parseFloat(balance.toString()).toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}
        </div>
        <p className="text-sm text-muted-foreground">
          {transactions.length} transactions
        </p>
      </div>

      {/* Chart Section */}

      {/* Transactions Section */}
    </div>
  );
};

export default AccountPage;
