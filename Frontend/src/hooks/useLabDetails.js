import { useQuery } from '@tanstack/react-query';
import { getLabOrdersApi } from '../api/labs/labs.api';

export const useLabDetails = (labId, filters = {}) => {
  const params = {
    page: filters.page || 1,
    limit: filters.limit || 8,
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.status && filters.status !== 'All' ? { lab_status: filters.status } : {}),
  };

  const query = useQuery({
    queryKey: ['labDetails', labId, params],
    queryFn: async () => {
      const data = await getLabOrdersApi(labId, params);

      // Map backend response fields to the structure expected by InventoryDetailDrawer
      if (data && data.orders) {
        data.orders = data.orders.map(item => {
          // Normalise status for display — map legacy aliases to In Lab
          const IN_LAB_ALIASES = ['Sent To Lab', 'In Production', 'Quality Check', 'Ready For Pickup', 'Customer Notified'];
          const displayStatus = IN_LAB_ALIASES.includes(item.lab_status)
            ? 'In Lab'
            : (item.lab_status || item.status);

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
            type: 'lab_order', // Display in the drawer as a lab order
            status: displayStatus,  // normalised: In Lab / Delivered
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
    enabled: !!labId,
    placeholderData: (prev) => prev,
    staleTime: 1000 * 30, // 30 seconds
    retry: false,
  });

  return {
    lab: query.data?.lab,
    orders: query.data?.orders || [],
    total: query.data?.total || 0,
    pages: query.data?.pages || 1,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
