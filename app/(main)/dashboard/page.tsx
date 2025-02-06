import CreateAccountDrawer from "@/components/createAccountDrawer";
import { Card } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import React from "react";
import { getUserAccounts } from "@/actions/dashboard";
import AccountCard from "./_components/AccountCard";
const page = async () => {
  const accounts = await getUserAccounts();
  return (
    <div>
      {/* Budget Progress  */}
      {/* Dashboard Overview */}
      {/* Accounts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CreateAccountDrawer>
          <Card className="hover:shadow-md transition-shadow cursor-pointer duration-300 border-dashed">
            <CardContent className="flex flex-col items-center justify-center text-muted-foreground h-full pt-5">
              <Plus className="h-10 w-10 mb-2" />
              <p className="text-sm font-medium">Add Account</p>
            </CardContent>
          </Card>
        </CreateAccountDrawer>
        {accounts?.map((account) => (
          <AccountCard key={account.id} account={account} />
        ))}
      </div>
    </div>
  );
};

export default page;
