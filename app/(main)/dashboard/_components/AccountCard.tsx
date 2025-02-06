"use client";

import { Account } from "@prisma/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import React, { useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { updateDefaultAccount } from "@/actions/accounts";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
type AccountCardProps = {
  account: Account;
};

const AccountCard = ({ account }: AccountCardProps) => {
  const { isDefault, name, balance, type, id } = account;

  const {
    data: updatedAccount,
    loading: updateDefaultLoading,
    error,
    fetchData: updateDefaultAccountFn,
  } = useFetch(updateDefaultAccount);

  const handleUpdateDefaultAccount = async (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();

    if (isDefault) {
      toast.error("You need at least one default account.");
      return;
    }

    await updateDefaultAccountFn(id);
  };

  useEffect(() => {
    if (updatedAccount) {
      toast.success("Default account updated successfully.");
    }
  }, [updatedAccount]);

  useEffect(() => {
    if (error) {
      toast.error(
        (error as Error).message || "Failed to update default account."
      );
    }
  }, [error]);

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer duration-300">
      <Link href={`/account/${id}`}>
        <CardHeader className="flex items-center justify-between flex-row space-y-0 pb-2">
          <CardTitle className="text-sm font-medium capitalize">
            {name}
          </CardTitle>
          <Switch
            checked={isDefault}
            onClick={handleUpdateDefaultAccount}
            disabled={updateDefaultLoading}
          />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {parseFloat(balance.toString()).toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
          </div>
          <div className="text-sm text-muted-foreground">
            {type === "CURRENT" ? "Current Account" : "Savings Account"}
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="mr-1 w-4 h-4 text-green-500" />
            Income
          </div>
          <div className="flex items-center gap-2">
            <ArrowDownRight className="mr-1 w-4 h-4 text-red-500" />
            Expense
          </div>
        </CardFooter>
      </Link>
    </Card>
  );
};

export default AccountCard;
