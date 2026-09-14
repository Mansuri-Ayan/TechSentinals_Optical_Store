import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  getAdminsApi,
  createAdminApi,
  getAdminDetailApi,
  updateAdminApi,
  deleteAdminApi,
  registerAdminPublicApi,
} from '../api/superadmin/superadmin.api';
import { sendAdminOtpApi, verifyAdminOtpApi, checkAdminOtpStatusApi } from '../api/auth/auth.api';

export const adminsQueryKey = 'superadmin-admins';

export const useSuperAdmin = (filters = {}) => {
  const queryClient = useQueryClient();

  const params = {
    page: filters.page || 1,
    limit: filters.limit || 20,
    search: filters.search || undefined,
  };

  const query = useQuery({
    queryKey: [adminsQueryKey, params],
    queryFn: () => getAdminsApi(params),
  });

  const createMutation = useMutation({
    mutationFn: createAdminApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [adminsQueryKey] });
      toast.success('Admin created successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to create admin');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ adminId, payload }) => updateAdminApi(adminId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [adminsQueryKey] });
      toast.success('Admin updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to update admin');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [adminsQueryKey] });
      toast.success('Admin deactivated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to deactivate admin');
    },
  });

  return {
    admins: query.data?.items || [],
    total: query.data?.total || 0,
    page: query.data?.page || 1,
    limit: query.data?.limit || 20,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,

    createAdmin: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    updateAdmin: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    deleteAdmin: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};

export const useAdminDetail = (adminId) => {
  return useQuery({
    queryKey: ['superadmin-admin-detail', adminId],
    queryFn: () => getAdminDetailApi(adminId),
    enabled: !!adminId,
  });
};

export const useRegisterAdminPublic = () => {
  const mutation = useMutation({
    mutationFn: registerAdminPublicApi,
    onSuccess: () => {
      toast.success('Admin registration successful!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Registration failed.');
    },
  });

  return {
    registerAdminPublicAsync: mutation.mutateAsync,
    isRegistering: mutation.isPending,
  };
};

export const useSendAdminOtp = () => {
  const mutation = useMutation({
    mutationFn: sendAdminOtpApi,
    onSuccess: (res) => {
      if (res.already_sent) {
        toast.info(res.message || 'An active verification code has already been sent to your email.');
      } else {
        toast.success(res.message || 'Verification code sent to your email.');
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to send verification code.');
    },
  });

  return {
    sendAdminOtpAsync: mutation.mutateAsync,
    isSendingOtp: mutation.isPending,
  };
};

export const useVerifyAdminOtp = () => {
  const mutation = useMutation({
    mutationFn: verifyAdminOtpApi,
    onSuccess: (res) => {
      toast.success(res.message || 'Email verified successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Invalid or expired verification code.');
    },
  });

  return {
    verifyAdminOtpAsync: mutation.mutateAsync,
    isVerifyingOtp: mutation.isPending,
  };
};

export const useCheckAdminOtpStatus = () => {
  const mutation = useMutation({
    mutationFn: checkAdminOtpStatusApi,
  });

  return {
    checkAdminOtpStatusAsync: mutation.mutateAsync,
    isCheckingStatus: mutation.isPending,
  };
};
