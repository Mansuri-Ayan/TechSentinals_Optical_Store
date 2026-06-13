import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  getNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
} from '../api/transactions/transaction.api';

export const notificationsQueryKey = ['notifications'];

export const useNotifications = (enabled = true) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: getNotificationsApi,
    refetchInterval: 1000 * 30, // Poll every 30s
    enabled: !!enabled,
    retry: false,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => markNotificationReadApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    },
    onError: (error) => {
      console.error('Failed to mark notification as read:', error);
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsReadApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      toast.success('All notifications marked as read.');
    },
    onError: (error) => {
      toast.error('Failed to mark all as read.');
    },
  });

  return {
    notifications: query.data?.notifications || [],
    unreadCount: query.data?.unread_count || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    markReadAsync: markReadMutation.mutateAsync,
    markAllReadAsync: markAllReadMutation.mutateAsync,
  };
};
