"use client";

import { Account } from "@prisma/client";
import { defaultCategories } from "@/app/data/categories";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transactionSchema } from "@/app/lib/schema";
import { z } from "zod";
import useFetch from "@/hooks/use-fetch";
import { createTransaction } from "@/actions/transaction";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CreateAccountDrawer from "@/components/createAccountDrawer";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type AddTransactionFormProps = {
  accounts: Account[];
  categories: typeof defaultCategories;
};

const AddTransactionForm = ({
  accounts,
  categories,
}: AddTransactionFormProps) => {
  const router = useRouter();

  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "EXPENSE",
      amount: "",
      date: new Date(),
      category: "",
      accountId: accounts.find((account) => account.isDefault)?.id || "",
      isRecurring: false,
      recurringInterval: undefined,
    },
  });

  const {
    data: transactionData,
    error: transactionError,
    loading: transactionLoading,
    fetchData: createTransactionFn,
  } = useFetch(createTransaction);

  const onSubmit = (data: z.infer<typeof transactionSchema>) => {
    const formData = {
      ...data,
      amount: parseFloat(data.amount),
    };
    createTransactionFn(formData);
  };

  useEffect(() => {
    if (transactionData?.success && !transactionLoading) {
      toast.success("Transaction created successfully");
      reset();
      router.push(`/account/${transactionData.data.accountId}`);
    }
  }, [transactionData, transactionLoading]);

  useEffect(() => {
    if (transactionError) {
      toast.error((transactionError as Error).message);
    }
  }, [transactionError]);

  const filteredCategories = categories.filter(
    (category) => category.type === watch("type")
  );

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      {/* AI Reciept Scanner */}
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="type">
          Type
        </label>
        <Select
          defaultValue={watch("type")}
          onValueChange={(value) =>
            setValue("type", value as "INCOME" | "EXPENSE")
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INCOME">Income</SelectItem>
            <SelectItem value="EXPENSE">Expense</SelectItem>
          </SelectContent>
        </Select>

        {errors.type && (
          <p className="text-sm text-red-500">{errors.type.message}</p>
        )}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="amount">
            Amount
          </label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register("amount")}
          />
          {errors.amount && (
            <p className="text-sm text-red-500">{errors.amount.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="accountId">
            Account
          </label>
          <Select
            defaultValue={watch("accountId")}
            onValueChange={(value) => setValue("accountId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                  {": "}
                  {Number(account.balance).toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })}
                </SelectItem>
              ))}
              <CreateAccountDrawer>
                <Button
                  variant="ghost"
                  className="w-full select-none items-center text-sm outline-none"
                >
                  Create Account
                </Button>
              </CreateAccountDrawer>
            </SelectContent>
          </Select>
          {errors.accountId && (
            <p className="text-sm text-red-500">{errors.accountId.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="category">
          Category
        </label>
        <Select
          defaultValue={watch("category")}
          onValueChange={(value) => setValue("category", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {filteredCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-sm text-red-500">{errors.category.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="date">
          Date
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full pl-3 text-left font-normal"
            >
              {watch("date") ? format(watch("date"), "PPP") : "Select a date"}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={watch("date")}
              onSelect={(date) => setValue("date", date || new Date())}
              disabled={(date) =>
                date > new Date() || date < new Date("1900-01-01")
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {errors.date && (
          <p className="text-sm text-red-500">{errors.date.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="description">
          Description
        </label>
        <Input {...register("description")} />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-1">
          <label
            htmlFor="isRecurring"
            className="text-sm font-medium cursor-pointer"
          >
            Recurring
          </label>
          <p className="text-sm text-muted-foreground">
            This transaction will recur on a regular basis
          </p>
        </div>
        <Switch
          id="isRecurring"
          checked={watch("isRecurring")}
          onCheckedChange={(checked) => setValue("isRecurring", checked)}
        />
        {errors.isRecurring && (
          <p className="text-sm text-red-500">{errors.isRecurring.message}</p>
        )}
      </div>

      {watch("isRecurring") && (
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="recurringInterval">
            Recurring Interval
          </label>
          <Select
            defaultValue={watch("recurringInterval")}
            onValueChange={(value) =>
              setValue(
                "recurringInterval",
                value as "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a recurring interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">Daily</SelectItem>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="YEARLY">Yearly</SelectItem>
            </SelectContent>
          </Select>
          {errors.recurringInterval && (
            <p className="text-sm text-red-500">
              {errors.recurringInterval.message}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          type="button"
          onClick={() => {
            reset();
            router.back();
          }}
          disabled={transactionLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={transactionLoading}>
          {transactionLoading ? "Adding..." : "Add Transaction"}
        </Button>
      </div>
    </form>
  );
};

export default AddTransactionForm;
