"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Transaction } from "@prisma/client";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AccountChartProps = {
  transactions: Transaction[];
};

const dateRanges = {
  "7D": {
    label: "Last 7 Days",
    days: 7,
  },
  "1M": {
    label: "Last Month",
    days: 30,
  },
  "3M": {
    label: "Last 3 Months",
    days: 90,
  },
  "6M": {
    label: "Last 6 Months",
    days: 180,
  },
  "1Y": {
    label: "Last Year",
    days: 365,
  },
  ALL: {
    label: "All Time",
    days: null,
  },
};

const AccountChart = ({ transactions }: AccountChartProps) => {
  const [selectedRange, setSelectedRange] =
    useState<keyof typeof dateRanges>("1M");

  const filteredTransactions = useMemo(() => {
    const { days } = dateRanges[selectedRange];
    const start = new Date();
    const startDate = days
      ? startOfDay(subDays(start, days))
      : startOfDay(new Date(0));
    const filtered = transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= startDate && transactionDate <= endOfDay(start);
    });

    const grouped = filtered.reduce((acc, transaction) => {
      const fullDate = new Date(transaction.date);
      const displayDate = format(transaction.date, "MMM dd");
      if (!acc[fullDate.getTime()]) {
        acc[fullDate.getTime()] = {
          date: displayDate,
          fullDate,
          income: 0,
          expense: 0,
        };
      }
      if (transaction.type === "INCOME") {
        acc[fullDate.getTime()].income += parseFloat(
          transaction.amount.toString()
        );
      } else {
        acc[fullDate.getTime()].expense += parseFloat(
          transaction.amount.toString()
        );
      }
      return acc;
    }, {} as Record<string, { date: string; fullDate: Date; income: number; expense: number }>);

    return Object.values(grouped)
      .sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime())
      .map(({ date, income, expense }) => ({ date, income, expense }));
  }, [transactions, selectedRange]);

  const totals = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, day) => ({
        income: acc.income + day.income,
        expense: acc.expense + day.expense,
      }),
      { income: 0, expense: 0 }
    );
  }, [filteredTransactions]);

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-7">
        <CardTitle className="text-base font-normal">
          Transaction Overview
        </CardTitle>
        <Select
          value={selectedRange}
          onValueChange={(value) =>
            setSelectedRange(value as keyof typeof dateRanges)
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select a range" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(dateRanges).map(([key, range]) => (
              <SelectItem key={key} value={key}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-col">
            <p className="text-sm text-muted-foreground">Total Income</p>
            <p className="text-lg font-semibold text-green-500">
              {totals.income.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              })}
            </p>
          </div>
          <div className="flex flex-col">
            <p className="text-sm text-muted-foreground">Total Expense</p>
            <p className="text-lg font-semibold text-red-500">
              {totals.expense.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              })}
            </p>
          </div>
          <div className="flex flex-col">
            <p className="text-sm text-muted-foreground">Net Income</p>
            <p
              className={`text-lg font-semibold ${
                totals.income - totals.expense > 0
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {(totals.income - totals.expense).toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              })}
            </p>
          </div>
        </div>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={filteredTransactions}
              margin={{
                top: 10,
                right: 10,
                left: 10,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  value.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })
                }
              />
              <Tooltip
                formatter={(value) =>
                  value.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })
                }
              />
              <Legend />
              <Bar
                name="Income"
                dataKey="income"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                name="Expense"
                dataKey="expense"
                fill="#f43f5e"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountChart;
