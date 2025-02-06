import { Account } from "@prisma/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import React from "react";
import { Switch } from "@/components/ui/switch";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
type AccountCardProps = {
  account: Account;
};

const AccountCard = ({ account }: AccountCardProps) => {
  const { isDefault, name, balance, type, id } = account;
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer duration-300">
      <Link href={`/account/${id}`}>
        <CardHeader className="flex items-center justify-between flex-row space-y-0 pb-2">
          <CardTitle className="text-sm font-medium capitalize">
            {name}
          </CardTitle>
          <Switch checked={isDefault} />
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
