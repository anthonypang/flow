import { getAccount } from "@/actions/accounts";
import NotFound from "@/app/not-found";
import React, { Suspense } from "react";
import TransactionsTable from "./_components/TransactionsTable";
import BarLoader from "react-spinners/BarLoader";
import AccountChart from "./_components/AccountChart";
const AccountPage = async ({ params }: { params: { id: string } }) => {
  const { id } = await params;

  const account = await getAccount(id);

  if (!account) {
    return <NotFound />;
  }

  const { name, type, balance, transactions } = account;

  return (
    <div className="space-y-8 px-5">
      <div className="flex gap-4 items-end justify-between">
        <div>
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
      </div>

      {/* Chart Section */}
      <Suspense
        fallback={
          <BarLoader
            className="mt-4"
            width={"100%"}
            color="#9333EA"
            height={4}
          />
        }
      >
        <AccountChart transactions={transactions} />
      </Suspense>
      {/* Transactions Section */}
      <Suspense
        fallback={
          <BarLoader
            className="mt-4"
            width={"100%"}
            color="#9333EA"
            height={4}
          />
        }
      >
        <TransactionsTable transactions={transactions} />
      </Suspense>
    </div>
  );
};

export default AccountPage;
