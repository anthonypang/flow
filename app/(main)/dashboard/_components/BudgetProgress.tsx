"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Pencil, X } from "lucide-react";
import { updateBudget } from "@/actions/budget";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

type BudgetProgressProps = {
  budget?: {
    amount: number;
    id: string;
  } | null;
  currentExpenses: number;
};

const BudgetProgress = ({ budget, currentExpenses }: BudgetProgressProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newBudget, setNewBudget] = useState(budget?.amount.toString() || "0");
  const percentageUsed = budget
    ? (currentExpenses / Number(budget.amount)) * 100
    : 0;

  const handleCancel = () => {
    setIsEditing(false);
    setNewBudget(budget?.amount.toString() || "0");
  };

  const {
    data: updatedBudget,
    loading: isLoading,
    error,
    fetchData: updateBudgetFn,
  } = useFetch(updateBudget);

  const handleSaveBudget = async () => {
    const amount = parseFloat(newBudget);
    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid number");
      return;
    }
    await updateBudgetFn(amount);
  };

  useEffect(() => {
    if (updatedBudget?.success) {
      setIsEditing(false);
      toast.success("Budget updated successfully");
    }
  }, [updatedBudget]);

  useEffect(() => {
    if (error) {
      toast.error((error as Error).message);
    }
  }, [error]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex-1">
          <CardTitle>Monthly Budget (Default Account)</CardTitle>
          <div className="flex items-center gap-2 mt-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  className="w-32"
                  placeholder="Enter new budget"
                  autoFocus
                  disabled={isLoading}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSaveBudget}
                  disabled={isLoading}
                >
                  <Check className="w-4 h-4 text-green-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  <X className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CardDescription>
                  {Number(budget?.amount) ? (
                    <span className="font-bold">
                      {currentExpenses.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}{" "}
                      of{" "}
                      {Number(budget?.amount).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}{" "}
                      spent
                    </span>
                  ) : (
                    "No budget set"
                  )}
                </CardDescription>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                  disabled={isLoading}
                >
                  <Pencil className="w-6 h-6" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {budget?.amount ? (
          <div className="space-y-2">
            <Progress
              value={percentageUsed}
              extraStyles={`${
                percentageUsed >= 90
                  ? "bg-red-500"
                  : percentageUsed >= 75
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
            />
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">$0.00</span>
              <span className="text-sm text-muted-foreground">
                {percentageUsed.toFixed(1)}% used
              </span>
              <span className="text-sm text-muted-foreground">
                {budget.amount.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}
              </span>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default BudgetProgress;
