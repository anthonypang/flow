"use client";

import { scanReceipt } from "@/actions/transaction";
import useFetch from "@/hooks/use-fetch";
import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Camera } from "lucide-react";
import { ReceiptData } from "./AddTransactionForm";
type ReceiptScannerProps = {
  onScanComplete: (data: ReceiptData) => void;
};

const ReceiptScanner = ({ onScanComplete }: ReceiptScannerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: receipt,
    error,
    loading: receiptLoading,
    fetchData: scanReceiptFn,
  } = useFetch(scanReceipt);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      await scanReceiptFn(file);
      // Reset the file input after scanning
      event.target.value = "";
    }
  };

  useEffect(() => {
    if (receipt && !receiptLoading) {
      toast.success("Receipt scanned successfully");
      onScanComplete(receipt);
    }
  }, [receipt, receiptLoading]);

  useEffect(() => {
    if (error) {
      toast.error("Error scanning receipt");
    }
  }, [error]);

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={receiptLoading}
        className="w-full h-10 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 animate-gradient 
        hover:opacity-90 transition-opacity text-white hover:text-white"
      >
        {receiptLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            <span>Scanning Receipt...</span>
          </>
        ) : (
          <>
            <Camera className="w-4 h-4 mr-2" />
            <span>Scan Receipt with AI</span>
          </>
        )}
      </Button>
    </div>
  );
};

export default ReceiptScanner;
