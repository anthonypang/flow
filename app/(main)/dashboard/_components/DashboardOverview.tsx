"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Account } from "@prisma/client";
import { Transaction } from "@prisma/client";
import { format } from "date-fns";
import { ArrowDownRight, ArrowUpRight, PieChart } from "lucide-react";
import React, { useState } from "react";
import { Cell, Legend, ResponsiveContainer, Tooltip } from "recharts";
import { Pie } from "recharts";

type DashboardOverviewProps = {
  accounts: Account[];
  transactions: Transaction[];
};

const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEEAD",
  "#D4A5A5",
  "#9FA8DA",
];

const DashboardOverview = ({
  accounts,
  transactions,
}: DashboardOverviewProps) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts.find((account) => account.isDefault)?.id || ""
  );

  const accountTransactions = transactions.filter(
    (transaction) => transaction.accountId === selectedAccountId
  );

  const recentTransactions = accountTransactions
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  const currentDate = new Date();
  const currentMonthExpenses = accountTransactions.filter((transaction) => {
    const transactionDate = new Date(transaction.date);
    return (
      transaction.type === "EXPENSE" &&
      transactionDate.getMonth() === currentDate.getMonth() &&
      transactionDate.getFullYear() === currentDate.getFullYear()
    );
  });

  const expensesByCategory = currentMonthExpenses.reduce(
    (acc, transaction) => {
      const category = transaction.category;
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += Number(transaction.amount);
      return acc;
    },
    {} as Record<string, number>
  );

  //   const currentMonthIncome = accountTransactions.filter((transaction) => {
  //     const transactionDate = new Date(transaction.date);
  //     return (
  //       transactionDate.getMonth() === currentDate.getMonth() &&
  //       transactionDate.getFullYear() === currentDate.getFullYear() &&
  //       transaction.type === "INCOME"
  //     );
  //   });

  //   const incomeByCategory = currentMonthIncome.reduce(
  //     (acc, transaction) => {
  //       const category = transaction.category;
  //       if (!acc[category]) {
  //         acc[category] = 0;
  //       }
  //       acc[category] += Number(transaction.amount);
  //       return acc;
  //     },
  //     {} as Record<string, number>
  //   );

  const pieChartData = Object.entries(expensesByCategory).map(
    ([category, amount]) => ({
      name: category,
      value: amount,
    })
  );

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-normal">
            Recent Transactions
          </CardTitle>
          <Select
            value={selectedAccountId}
            onValueChange={setSelectedAccountId}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select Account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTransactions.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground">
                No transactions found
              </div>
            ) : (
              recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {transaction.description || "Untitled Transaction"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(transaction.date, "PP")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        "flex items-center",
                        transaction.type === "EXPENSE"
                          ? "text-red-500"
                          : "text-green-500"
                      )}
                    >
                      {transaction.type === "EXPENSE" ? (
                        <ArrowDownRight className="w-4 h-4 mr-1" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                      ${Number(transaction.amount).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-normal">
            Monthly Expenses Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-5">
          {pieChartData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: $${value.toFixed(2)}`}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              No expenses found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardOverview;
