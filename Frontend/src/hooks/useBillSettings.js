import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBillSettingsAdmin, updateBillSettingsAdmin, getBillSettingsShopkeeper, updateBillSettingsShopkeeper } from "../api/billSettings/billSettings.api";
import { toast } from "react-toastify"; 
import { useAuthStore } from "../store/store";

export const useBillSettings = (storeId) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const settingsQuery = useQuery({
    queryKey: ["billSettings", storeId, isAdmin],
    queryFn: async () => {
      let response;
      if (isAdmin && storeId) {
        response = await getBillSettingsAdmin(storeId);
      } else {
        response = await getBillSettingsShopkeeper();
      }
      return response.data;
    },
    enabled: !!user && (!isAdmin || !!storeId),
    staleTime: 5 * 60 * 1000,
  });

  const { mutateAsync: updateSettingsAsync, isPending: isUpdating } = useMutation({
    mutationFn: async (payload) => {
      if (isAdmin && storeId) {
        return await updateBillSettingsAdmin(storeId, payload);
      } else {
        return await updateBillSettingsShopkeeper(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billSettings", storeId, isAdmin] });
      toast.success("Bill settings updated successfully!");
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.detail || "Failed to update bill settings"
      );
    },
  });

  return {
    settings: settingsQuery.data,
    isLoading: settingsQuery.isLoading,
    isError: settingsQuery.isError,
    updateSettingsAsync,
    isUpdating,
  };
};
