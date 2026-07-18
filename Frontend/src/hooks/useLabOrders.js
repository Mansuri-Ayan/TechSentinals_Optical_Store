import { useQuery } from '@tanstack/react-query';
import { getSalesApi } from '../api/sales/sales.api';

export const labOrdersQueryKey = 'labOrders';

/**
 * React Query hook for paginated, filtered lab orders.
 *
 * @param {Object} filters - { page, limit, storeId, tab, status, search, dateFrom, dateTo }
 */
export const useLabOrders = (filters = {}) => {
  const params = {
    page: filters.page || 1,
    limit: filters.limit || 6,
    paginate: true,
    is_lab_order: true,
    tab: filters.tab || 'queue',
    ...(filters.storeId && filters.storeId !== 'All' ? { store_id: filters.storeId } : {}),
    ...(filters.status && filters.status !== 'All' ? { lab_status: filters.status } : {}),
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.dateFrom ? { date_from: filters.dateFrom } : {}),
    ...(filters.dateTo ? { date_to: filters.dateTo } : {}),
  };

  const query = useQuery({
    queryKey: [labOrdersQueryKey, params],
    queryFn: async () => {
      const data = await getSalesApi(params);

      // Map backend fields to frontend structure expected by LabOrders/InventoryDetailDrawer
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
            type: 'lab_order', // Ensures the details drawer shows lab order details
            status: item.lab_status, // Use backend lab_status for workflow tracking
            sentDate: item.sent_to_lab_date,
            expectedDeliveryDate: item.expected_delivery_date,
            deliveryDate: item.lab_status === 'Delivered' ? item.updated_at : null,
            labName: item.lab_name,
            labId: item.lab_id,
          };
        });
      }
      return data;
    },
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: false,
  });

  return {
    labOrdersQuery: query,
    orders: query.data?.items || [],
    total: query.data?.total || 0,
    pages: query.data?.pages || 1,
    currentPage: query.data?.page || 1,
    kpis: query.data?.kpis || { totalCount: 0, inProduction: 0, readyForPickup: 0, totalValuation: 0 },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
  };
};
