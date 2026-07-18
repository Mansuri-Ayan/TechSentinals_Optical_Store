import { useQuery } from '@tanstack/react-query';
import { getSalesApi } from '../api/sales/sales.api';

export const salesQueryKey = 'sales';

/**
 * React Query hook for paginated, filtered sales.
 *
 * @param {Object} filters - { page, limit, storeId, status, search, dateFrom, dateTo }
 */
export const useSales = (filters = {}) => {
  const params = {
    page: filters.page || 1,
    limit: filters.limit || 8,
    paginate: true,
    ...(filters.storeId && filters.storeId !== 'All' ? { store_id: filters.storeId } : {}),
    ...(filters.status && filters.status !== 'All' ? { status: filters.status } : {}),
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.dateFrom ? { date_from: filters.dateFrom } : {}),
    ...(filters.dateTo ? { date_to: filters.dateTo } : {}),
    ...(filters.hasDue !== undefined ? { has_due: filters.hasDue } : {}),
  };

  const query = useQuery({
    queryKey: [salesQueryKey, params],
    queryFn: async () => {
      const data = await getSalesApi(params);
      // Map backend fields to frontend structure
      if (data && data.items) {
        data.items = data.items.map(item => {
          let paymentStatus = 'Unpaid';
          const due = Number(item.due_amount || 0);
          const paid = Number(item.paid_amount || 0);
          if (due <= 0) {
            paymentStatus = 'Paid';
          } else if (paid > 0) {
            paymentStatus = 'Partially Paid';
          }

          const paymentMethod = item.payments && item.payments.length > 0
            ? item.payments.map(p => p.payment_method).join(' + ')
            : 'Credit';

          return {
            ...item,
            orderId: item.invoice_number,
            orderDate: item.sale_date,
            customerName: item.customer_name,
            customerPhone: item.customer_phone,
            customerAddress: item.customer_address,
            billedOnAccountOf: item.billed_on_account_of,
            branchName: item.store_name,
            staffName: item.staff_name,
            staffCode: item.staff_code,
            staffRole: item.staff_role,
            productName: item.product_name,
            productCategory: item.product_category,
            productSubcategory: item.product_subcategory,
            productQuantity: item.product_quantity,
            productPrice: item.product_price,
            paymentStatus,
            paymentMethod,
            totalAmount: item.total_amount,
            subtotal: item.subtotal,
            discountAmount: item.discount_amount,
            paidAmount: item.paid_amount,
            dueAmount: item.due_amount,
            type: 'sales',
            deliveryDate: item.lab_status ? (item.lab_status === 'Delivered' ? item.updated_at : null) : item.sale_date,
            labName: item.lab_name,
            labId: item.lab_id,
          };
        });
      }
      return data;
    },
    placeholderData: (prev) => prev,
    staleTime: 0,
    retry: false,
  });

  return {
    salesQuery: query,
    sales: query.data?.items || [],
    total: query.data?.total || 0,
    pages: query.data?.pages || 1,
    currentPage: query.data?.page || 1,
    kpis: query.data?.kpis || { revenue: 0, totalOrders: 0, completed: 0, active: 0 },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
  };
};
