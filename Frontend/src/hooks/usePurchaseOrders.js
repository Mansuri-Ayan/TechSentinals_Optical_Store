import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  getPurchaseOrdersApi,
  createPurchaseOrderApi,
  receiveGoodsApi,
  recordSupplierPaymentApi,
  getPOInvoiceApi,
} from '../api/purchase_order/purchase_order.api';
import { updateProductApi } from '../api/product/product.api';

export const purchaseOrdersQueryKey = ['purchaseOrders'];

/**
 * Hook to fetch PO invoice JSON / HTML.
 */
export const usePOInvoice = (poId) => {
  return useQuery({
    queryKey: [purchaseOrdersQueryKey, poId, 'invoice'],
    queryFn: () => getPOInvoiceApi(poId),
    enabled: !!poId,
    staleTime: 1000 * 60,
    retry: false,
  });
};


/**
 * Hook to retrieve purchase orders with React Query.
 */
export const usePurchaseOrders = (filters = {}) => {
  const queryClient = useQueryClient();

  const params = {
    limit: filters.limit || 100,
    offset: filters.offset || 0,
    include_nested: filters.include_nested !== undefined ? filters.include_nested : true,
    ...(filters.supplier_id ? { supplier_id: Number(filters.supplier_id) } : {}),
    ...(filters.store_id ? { store_id: Number(filters.store_id) } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.has_due !== undefined ? { has_due: filters.has_due } : {}),
  };

  const query = useQuery({
    queryKey: [purchaseOrdersQueryKey, params],
    queryFn: () => getPurchaseOrdersApi(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const invalidatePurchaseOrders = () => {
    queryClient.invalidateQueries({ queryKey: [purchaseOrdersQueryKey] });
  };

  // Composite mutation to record a complete purchase: create draft PO -> receive goods -> record payment
  const recordPurchaseMutation = useMutation({
    mutationFn: async (params) => {
      const item = params.items?.[0];
      const supplierId = params.supplierId || item?.supplierId;
      const storeId = params.storeId;
      const productId = params.productId ?? item?.productId ?? item?.product_id;
      const quantity = params.quantity ?? item?.quantityOrdered ?? item?.quantity ?? item?.quantity_ordered;
      const costPrice = params.costPrice ?? item?.unitPrice ?? item?.unit_price;
      const sellingPrice = params.sellingPrice ?? item?.sellingPrice ?? item?.selling_price;
      const discountPercent = params.discountPercent ?? item?.discountPercent ?? item?.discount_percent;
      const lowStockThreshold = params.lowStockThreshold ?? item?.lowStockThreshold ?? item?.low_stock_threshold;
      const totalAmount = params.totalAmount ?? params.amount ?? (Number(quantity) * Number(costPrice));
      const paidAmount = params.paidAmount ?? 0;
      const paymentMethod = params.paymentMethod || params.method || 'Cash';
      const date = params.date || params.orderDate || new Date().toISOString().split('T')[0];
      const remarks = params.remarks || params.notes || '';

      if (!productId || isNaN(Number(productId))) {
        throw new Error('Valid Product ID is required to record purchase.');
      }
      if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
        throw new Error('Valid quantity (>= 1) is required.');
      }

      // 0. Update product details if pricing info is provided
      if (productId && (costPrice !== undefined || sellingPrice !== undefined || discountPercent !== undefined || lowStockThreshold !== undefined)) {
        const updatePayload = {};
        if (costPrice !== undefined && costPrice !== null && !isNaN(Number(costPrice))) updatePayload.cost_price = Number(costPrice);
        if (sellingPrice !== undefined && sellingPrice !== null && !isNaN(Number(sellingPrice))) updatePayload.selling_price = Number(sellingPrice);
        if (discountPercent !== undefined && discountPercent !== null && !isNaN(Number(discountPercent))) updatePayload.discount_percent = Number(discountPercent);
        if (lowStockThreshold !== undefined) updatePayload.low_stock_threshold = lowStockThreshold !== null ? Number(lowStockThreshold) : null;
        if (Object.keys(updatePayload).length > 0) {
          try {
            await updateProductApi(productId, updatePayload);
          } catch (err) {
            console.error('Failed to update product details before purchase order:', err);
            // Non-blocking: proceed with purchase order even if catalog update fails
          }
        }
      }

      // 1. Create the Purchase Order
      const unitPrice = costPrice !== undefined && !isNaN(Number(costPrice))
        ? Number(costPrice)
        : (Number(totalAmount) / Number(quantity));

      const poPayload = {
        supplier_id: Number(supplierId),
        store_id: (storeId === 'warehouse' || storeId === -1 || !storeId) ? null : Number(storeId),
        order_date: date,
        expected_delivery_date: date,
        notes: remarks || '',
        items: [
          {
            product_id: Number(productId),
            quantity_ordered: Number(quantity),
            unit_price: Number(unitPrice),
            tax_percent: 0,
            discount_percent: 0,
            notes: remarks || '',
          },
        ],
      };

      const createdPo = await createPurchaseOrderApi(poPayload);

      // 2. Receive the goods immediately
      const poItemId = createdPo.items?.[0]?.id;
      if (!poItemId) {
        throw new Error('Failed to create purchase order items.');
      }

      const receivePayload = {
        items: [
          {
            purchase_order_item_id: poItemId,
            quantity_received: Number(quantity),
          },
        ],
      };

      const receivedPo = await receiveGoodsApi(createdPo.id, receivePayload);

      // 3. If there is a paid amount, record the payment
      if (paidAmount > 0) {
        // Map UI payment method to backend enum format (e.g. "Bank Transfer" -> "BANK_TRANSFER")
        const methodMap = {
          'Cash': 'CASH',
          'Bank Transfer': 'BANK_TRANSFER',
          'UPI': 'UPI',
          'Cheque': 'CHEQUE',
          'Credit': 'CREDIT_NOTE'
        };
        const paymentPayload = {
          payment_date: date,
          amount: Number(paidAmount),
          payment_method: methodMap[paymentMethod] || 'CASH',
          reference_number: remarks || 'Initial Payment',
          remarks: remarks || '',
        };
        await recordSupplierPaymentApi(createdPo.id, paymentPayload);
      }

      return receivedPo;
    },
    onSuccess: () => {
      invalidatePurchaseOrders();
      toast.success('Purchase recorded and inventory updated successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || error.message || 'Failed to record purchase.');
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async ({ poId, payload }) => {
      return recordSupplierPaymentApi(poId, payload);
    },
    onSuccess: () => {
      invalidatePurchaseOrders();
      toast.success('Payment recorded successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || error.message || 'Failed to record payment.');
    },
  });

  return {
    purchaseOrders: query.data || [],
    isLoadingPurchaseOrders: query.isLoading,
    isFetchingPurchaseOrders: query.isFetching,
    isPurchaseOrdersError: query.isError,
    purchaseOrdersQuery: query,
    recordPurchaseAsync: recordPurchaseMutation.mutateAsync,
    isRecordingPurchase: recordPurchaseMutation.isPending,
    recordPaymentAsync: recordPaymentMutation.mutateAsync,
    isRecordingPayment: recordPaymentMutation.isPending,
  };
};
