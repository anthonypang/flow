/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { toast } from "sonner";
const useFetch = (callback: (...args: any[]) => Promise<any>) => {
  const [data, setData] = useState(undefined);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async (...args: any) => {
    setLoading(true);
    try {
      const response = await callback(...args);
      setData(response);
    } catch (error: any) {
      setError(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return { data: data as any, error, loading, fetchData, setData };
};

export default useFetch;
