import api from '../../lib/axios';

/**
 * Submit Pre-Lab QC Evaluation for a SaleItem
 * @param {number} saleItemId
 * @param {Object} data - { passed: boolean, notes?: string }
 */
export const submitPreLabQCApi = async (saleItemId, data) => {
  const response = await api.post(`/qc/items/${saleItemId}/pre-lab`, data);
  return response.data;
};

/**
 * Fetch replacement stock availability (local + sister stores under same admin) & supplier info
 * @param {number} saleItemId
 */
export const getItemReplacementOptionsApi = async (saleItemId) => {
  const response = await api.get(`/qc/items/${saleItemId}/replacement-options`);
  return response.data;
};

/**
 * Resolve damaged item with chosen action:
 * REPLACE_LOCAL, REQUEST_TRANSFER, SUPPLIER_PURCHASE, or CUSTOMER_DECISION
 * @param {number} saleItemId
 * @param {Object} data
 */
export const resolveSaleItemDamageApi = async (saleItemId, data) => {
  const response = await api.post(`/qc/items/${saleItemId}/resolve-damage`, data);
  return response.data;
};


/**
 * Submit Post-Lab QC Evaluation for a SaleItem
 * @param {number} saleItemId
 * @param {Object} data - { outcome: 'PASSED' | 'FITTING_FAILURE' | 'LAB_DAMAGE' | 'STOCK_DAMAGE', notes?: string }
 */
export const submitPostLabQCApi = async (saleItemId, data) => {
  const response = await api.post(`/qc/items/${saleItemId}/post-lab`, data);
  return response.data;
};

/**
 * Log Customer Contact & Decision for a SaleItem
 * @param {number} saleItemId
 * @param {Object} data - { contact_channel: 'PHONE' | 'WHATSAPP' | 'EMAIL_SYSTEM', summary_notes: string, customer_choice?: string }
 */
export const logCustomerContactApi = async (saleItemId, data) => {
  const response = await api.post(`/qc/items/${saleItemId}/contact-log`, data);
  return response.data;
};

/**
 * Fetch SaleItem QC Audit History
 * @param {number} saleItemId
 */
export const getItemQCHistoryApi = async (saleItemId) => {
  const response = await api.get(`/qc/items/${saleItemId}/history`);
  return response.data;
};

/**
 * Fetch SaleItem Customer Contact Logs
 * @param {number} saleItemId
 */
export const getItemContactLogsApi = async (saleItemId) => {
  const response = await api.get(`/qc/items/${saleItemId}/contact-logs`);
  return response.data;
};

/**
 * List Damaged / Issue Items for Damaged Items Portal
 * @param {Object} params - { store_id, damage_type, stage, status, search, page, limit }
 */
export const getDamagedItemsApi = async (params = {}) => {
  const response = await api.get('/qc/damaged-items', { params });
  return response.data;
};

/**
 * Record Supplier or Lab Damage Compensation
 * @param {number} damagedItemId
 * @param {Object} data - { compensation_type, amount, po_id, resolution_notes }
 */
export const resolveDamageCompensationApi = async (damagedItemId, data) => {
  const response = await api.post(`/qc/damaged-items/${damagedItemId}/resolve-compensation`, data);
  return response.data;
};

/**
 * Resolve Supplier Damage Claim (1. Replacement, 2. Equivalent item, 3. Cash/Credit)
 * @param {number} damagedItemId
 * @param {Object} data - { resolution_type, compensation_amount, new_product_id, po_id, resolution_notes }
 */
export const resolveSupplierDamageApi = async (damagedItemId, data) => {
  const response = await api.post(`/qc/damaged-items/${damagedItemId}/supplier-resolution`, data);
  return response.data;
};

/**
 * Resolve Lab Damage Claim
 * @param {number} damagedItemId
 * @param {Object} data - { resolution_type, compensation_amount, loss_reason, loss_amount, resolution_notes }
 */
export const resolveLabDamageApi = async (damagedItemId, data) => {
  const response = await api.post(`/qc/damaged-items/${damagedItemId}/lab-resolution`, data);
  return response.data;
};

/**
 * Mark Damaged Item Directly as Loss
 * @param {number} damagedItemId
 * @param {Object} data - { loss_reason, loss_amount, resolution_notes }
 */
export const markDamagedItemAsLossApi = async (damagedItemId, data) => {
  const response = await api.post(`/qc/damaged-items/${damagedItemId}/mark-as-loss`, data);
  return response.data;
};

/**
 * Verify & Complete Promised Damage Resolution
 * @param {number} damagedItemId
 * @param {Object} data - { verified_notes?: string, received_quantity?: number }
 */
export const verifyCompleteDamageApi = async (damagedItemId, data = {}) => {
  const response = await api.post(`/qc/damaged-items/${damagedItemId}/verify-complete`, data);
  return response.data;
};

/**
 * Mark Promised Resolution as Failed
 * @param {number} damagedItemId
 * @param {Object} data - { failure_reason: string, notes?: string }
 */
export const markFailedDamageApi = async (damagedItemId, data) => {
  const response = await api.post(`/qc/damaged-items/${damagedItemId}/mark-failed`, data);
  return response.data;
};

/**
 * Reopen a Resolved, Loss, or Failed Damage Record
 * @param {number} damagedItemId
 * @param {Object} data - { reason: string, notes?: string }
 */
export const reopenDamagedItemApi = async (damagedItemId, data) => {
  const response = await api.post(`/qc/damaged-items/${damagedItemId}/reopen`, data);
  return response.data;
};

/**
 * Change Resolution of a Damage Record
 * @param {number} damagedItemId
 * @param {Object} data - { new_resolution_type, compensation_type?, compensation_amount?, loss_reason?, loss_amount?, is_promise?: boolean, expected_date?: string, change_reason: string, notes?: string }
 */
export const changeDamageResolutionApi = async (damagedItemId, data) => {
  const response = await api.post(`/qc/damaged-items/${damagedItemId}/change-resolution`, data);
  return response.data;
};

/**
 * Fetch Full Audit History for a Damaged Item
 * @param {number} damagedItemId
 */
export const getDamagedItemHistoryApi = async (damagedItemId) => {
  const response = await api.get(`/qc/damaged-items/${damagedItemId}/history`);
  return response.data;
};

