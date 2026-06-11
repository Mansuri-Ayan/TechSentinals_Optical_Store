import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  getCustomersApi,
  getCustomerApi,
  createCustomerApi,
  updateCustomerApi,
  deleteCustomerApi,
  createPrescriptionApi,
  updatePrescriptionApi,
  addSalePaymentApi,
  updateSaleApi,
  createManualOrderApi,
} from '../api/customer/customer.api';

export const customersQueryKey = ['customers'];
export const customerDetailQueryKey = ['customer'];

/**
 * Maps database customer objects (snake_case) to frontend (camelCase).
 */
const mapCustomer = (c) => {
  if (!c) return null;
  return {
    id: c.id,
    firstName: c.first_name,
    lastName: c.last_name || '',
    email: c.email || '',
    phone: c.phone,
    dateOfBirth: c.date_of_birth || '',
    gender: c.gender || 'NOT_SPECIFIED',
    address: c.address || '',
    city: c.city || '',
    state: c.state || '',
    pincode: c.pincode || '',
    remark: c.remark || '',
    isActive: c.is_active,
    customerSince: c.created_at ? c.created_at.split('T')[0] : '',
    lastVisit: c.last_visit ? c.last_visit.split('T')[0] : '',
    totalOrders: c.total_orders || 0,
    totalAmount: c.total_amount || 0,
    outstandingBalance: c.outstanding_balance || 0,
    status: c.status || 'Active',
    storeId: c.store_id,
    firstVisitStoreId: c.first_visit_store_id,
    storeName: c.store_name,
    firstVisitStoreName: c.first_visit_store_name,
    orders: c.orders || [],
    prescription: c.prescription || null,
    prescriptionHistory: c.prescription_history || [],
    history: c.history || [],
  };
};

/**
 * Hook to retrieve the list of customers.
 */
export const useCustomers = (filters = {}) => {
  const params = {
    limit: filters.limit || 500,
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.store_id ? { store_id: filters.store_id } : {}),
  };

  const query = useQuery({
    queryKey: [customersQueryKey, params],
    queryFn: async () => {
      const data = await getCustomersApi(params);
      return Array.isArray(data) ? data.map(mapCustomer) : [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: false,
  });

  return {
    customers: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

/**
 * Hook to retrieve a single customer's full detail.
 */
export const useCustomer = (customerId) => {
  const query = useQuery({
    queryKey: [customerDetailQueryKey, customerId],
    queryFn: async () => {
      const data = await getCustomerApi(customerId);
      return mapCustomer(data);
    },
    enabled: Boolean(customerId),
    staleTime: 1000 * 60 * 2,
    retry: false,
  });

  return {
    customer: query.data || null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

/**
 * Mutation hooks for customer operations.
 */
export const useCustomerMutations = (customerId = null) => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [customersQueryKey] });
    if (customerId) {
      queryClient.invalidateQueries({ queryKey: [customerDetailQueryKey, customerId] });
    }
  };

  const createCustomerMutation = useMutation({
    mutationFn: createCustomerApi,
    onSuccess: () => {
      invalidate();
      toast.success('Customer profile created successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create customer profile.');
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, payload }) => updateCustomerApi(id, payload),
    onSuccess: () => {
      invalidate();
      toast.success('Customer profile updated successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update customer profile.');
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: deleteCustomerApi,
    onSuccess: () => {
      invalidate();
      toast.success('Customer profile deleted successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete customer profile.');
    },
  });

  const createPrescriptionMutation = useMutation({
    mutationFn: (payload) => {
      // Convert nested rightEye/leftEye structure into flat database format
      const formatted = {
        customer_id: Number(payload.customerId),
        sph_right: payload.rightEye?.sph !== '' && payload.rightEye?.sph !== undefined ? String(payload.rightEye.sph) : null,
        cyl_right: payload.rightEye?.cyl !== '' && payload.rightEye?.cyl !== undefined ? String(payload.rightEye.cyl) : null,
        axis_right: payload.rightEye?.axis !== '' && payload.rightEye?.axis !== undefined ? String(payload.rightEye.axis) : null,
        sph_left: payload.leftEye?.sph !== '' && payload.leftEye?.sph !== undefined ? String(payload.leftEye.sph) : null,
        cyl_left: payload.leftEye?.cyl !== '' && payload.leftEye?.cyl !== undefined ? String(payload.leftEye.cyl) : null,
        axis_left: payload.leftEye?.axis !== '' && payload.leftEye?.axis !== undefined ? String(payload.leftEye.axis) : null,
        addition: payload.rightEye?.addPower !== '' && payload.rightEye?.addPower !== undefined ? String(payload.rightEye.addPower) : null,
        pupillary_distance: payload.rightEye?.pd !== '' && payload.rightEye?.pd !== undefined ? String(payload.rightEye.pd) : null,
        prescription_date: payload.prescriptionDate || new Date().toISOString().split('T')[0],
        notes: payload.notes || null,
        lens_type: payload.lensType || null,
        lens_material: payload.lensMaterial || null,
        lens_coating: payload.lensCoating || null,
        frame_preference: payload.framePreference || null,
        expiry_date: payload.expiryDate || null,
        recommended_usage: payload.recommendedUsage || null,
        doctor_name: payload.doctorName || null,
      };
      return createPrescriptionApi(formatted);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Prescription recorded successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to record prescription.');
    },
  });

  const addSalePaymentMutation = useMutation({
    mutationFn: ({ saleId, payload }) => addSalePaymentApi(saleId, payload),
    onSuccess: () => {
      invalidate();
      toast.success('Payment recorded successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to record payment.');
    },
  });

  const updateSaleMutation = useMutation({
    mutationFn: ({ saleId, payload }) => updateSaleApi(saleId, payload),
    onSuccess: () => {
      invalidate();
      toast.success('Order status updated successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update order status.');
    },
  });

  const createManualOrderMutation = useMutation({
    mutationFn: ({ customerId, payload }) => {
      const formatted = {
        order_date: payload.orderDate,
        frame_name: payload.frameName,
        lens_type: payload.lensType || null,
        status: payload.status || 'Pending',
        amount: Number(payload.amount),
      };
      return createManualOrderApi(customerId, formatted);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Manual order logged successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to log manual order.');
    },
  });

  return {
    createCustomerAsync: createCustomerMutation.mutateAsync,
    updateCustomerAsync: updateCustomerMutation.mutateAsync,
    deleteCustomerAsync: deleteCustomerMutation.mutateAsync,
    createPrescriptionAsync: createPrescriptionMutation.mutateAsync,
    addSalePaymentAsync: addSalePaymentMutation.mutateAsync,
    updateSaleAsync: updateSaleMutation.mutateAsync,
    createManualOrderAsync: createManualOrderMutation.mutateAsync,
    isMutating:
      createCustomerMutation.isPending ||
      updateCustomerMutation.isPending ||
      createPrescriptionMutation.isPending ||
      addSalePaymentMutation.isPending ||
      updateSaleMutation.isPending ||
      createManualOrderMutation.isPending,
  };
};
