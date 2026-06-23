/** @format */

// List of branches/stores
export const ACCOUNTANT_STORES = [
  { id: 1, name: 'Main Branch', location: 'Downtown' },
  { id: 2, name: 'Branch 2', location: 'West End' },
  { id: 3, name: 'Branch 3', location: 'Metro Station' },
  { id: 4, name: 'Admin Store', location: 'Corporate office' }
];

// Sales Ledger mock data
export const MOCK_SALES_LEDGER = [
  {
    id: 1,
    invoiceNo: 'INV-2026-001',
    date: '2026-06-01',
    customerName: 'Aarav Mehta',
    storeName: 'Main Branch',
    items: 'Progressive Lenses + Titanium Frame',
    subtotal: 12500,
    cgst: 1125, // 9%
    sgst: 1125, // 9%
    igst: 0,
    total: 14750,
    paymentMethod: 'UPI',
    status: 'Paid'
  },
  {
    id: 2,
    invoiceNo: 'INV-2026-002',
    date: '2026-06-02',
    customerName: 'Priya Sharma',
    storeName: 'Branch 2',
    items: 'Single Vision Lenses + Ray-Ban Aviator',
    subtotal: 9500,
    cgst: 855,
    sgst: 855,
    igst: 0,
    total: 11210,
    paymentMethod: 'Credit Card',
    status: 'Paid'
  },
  {
    id: 3,
    invoiceNo: 'INV-2026-003',
    date: '2026-06-02',
    customerName: 'Amit Patel',
    storeName: 'Main Branch',
    items: 'Bifocal Lenses + Acetate Frame',
    subtotal: 7500,
    cgst: 675,
    sgst: 675,
    igst: 0,
    total: 8850,
    paymentMethod: 'Cash',
    status: 'Due'
  },
  {
    id: 4,
    invoiceNo: 'INV-2026-004',
    date: '2026-06-03',
    customerName: 'Sneha Reddy',
    storeName: 'Branch 3',
    items: 'Contact Lenses (Acuvue 6-pack)',
    subtotal: 3200,
    cgst: 288,
    sgst: 288,
    igst: 0,
    total: 3776,
    paymentMethod: 'UPI',
    status: 'Paid'
  },
  {
    id: 5,
    invoiceNo: 'INV-2026-005',
    date: '2026-06-04',
    customerName: 'Vikram Singh',
    storeName: 'Admin Store',
    items: 'Blue-Cut Computer Glasses + Matte Frame',
    subtotal: 4800,
    cgst: 432,
    sgst: 432,
    igst: 0,
    total: 5664,
    paymentMethod: 'Bank Transfer',
    status: 'Paid'
  },
  {
    id: 6,
    invoiceNo: 'INV-2026-006',
    date: '2026-06-05',
    customerName: 'Anjali Desai',
    storeName: 'Main Branch',
    items: 'Anti-Glare Glasses + Cat Eye Frame',
    subtotal: 6000,
    cgst: 540,
    sgst: 540,
    igst: 0,
    total: 7080,
    paymentMethod: 'Cash',
    status: 'Due'
  },
  {
    id: 7,
    invoiceNo: 'INV-2026-007',
    date: '2026-06-06',
    customerName: 'Rajesh Kumar',
    storeName: 'Branch 2',
    items: 'Polarized Sunglasses (Oakley)',
    subtotal: 11000,
    cgst: 990,
    sgst: 990,
    igst: 0,
    total: 12980,
    paymentMethod: 'UPI',
    status: 'Paid'
  },
  {
    id: 8,
    invoiceNo: 'INV-2026-008',
    date: '2026-06-07',
    customerName: 'Karan Malhotra',
    storeName: 'Branch 3',
    items: 'Photochromic Lenses + Steel Frame',
    subtotal: 8200,
    cgst: 738,
    sgst: 738,
    igst: 0,
    total: 9676,
    paymentMethod: 'Credit Card',
    status: 'Paid'
  },
  {
    id: 9,
    invoiceNo: 'INV-2026-009',
    date: '2026-06-08',
    customerName: 'Neha Gupta',
    storeName: 'Main Branch',
    items: 'Designer Eyeglasses (Prada)',
    subtotal: 18500,
    cgst: 1665,
    sgst: 1665,
    igst: 0,
    total: 21830,
    paymentMethod: 'UPI',
    status: 'Paid'
  },
  {
    id: 10,
    invoiceNo: 'INV-2026-010',
    date: '2026-06-09',
    customerName: 'Rohan Joshi',
    storeName: 'Branch 2',
    items: 'Kids Frame + Shatterproof Lenses',
    subtotal: 3900,
    cgst: 351,
    sgst: 351,
    igst: 0,
    total: 4602,
    paymentMethod: 'UPI',
    status: 'Due'
  }
];

// Expenses mock data
export const MOCK_EXPENSES = [
  {
    id: 1,
    expenseNo: 'EXP-2026-001',
    title: 'Monthly Store Rent',
    category: 'Rent',
    amount: 45000,
    date: '2026-06-01',
    storeName: 'Main Branch',
    paymentMethod: 'Bank Transfer',
    description: 'Rent for downtown premises',
    status: 'Approved'
  },
  {
    id: 2,
    expenseNo: 'EXP-2026-002',
    title: 'Electricity Bill May 2026',
    category: 'Utilities',
    amount: 12500,
    date: '2026-06-02',
    storeName: 'Branch 2',
    paymentMethod: 'UPI',
    description: 'Electric supply charges for west end shop',
    status: 'Approved'
  },
  {
    id: 3,
    expenseNo: 'EXP-2026-003',
    title: 'Optical Accessories Supply',
    category: 'Purchases',
    amount: 28000,
    date: '2026-06-03',
    storeName: 'Main Branch',
    paymentMethod: 'Credit Card',
    description: 'Microfiber cloths and cleaning spray bottles',
    status: 'Pending'
  },
  {
    id: 4,
    expenseNo: 'EXP-2026-004',
    title: 'Staff Refreshments',
    category: 'Food',
    amount: 3200,
    date: '2026-06-04',
    storeName: 'Branch 3',
    paymentMethod: 'Cash',
    description: 'Snacks and beverages for branch meeting',
    status: 'Approved'
  },
  {
    id: 5,
    expenseNo: 'EXP-2026-005',
    title: 'Broadband Internet bill',
    category: 'Utilities',
    amount: 1800,
    date: '2026-06-05',
    storeName: 'Admin Store',
    paymentMethod: 'UPI',
    description: 'Jio fiber broadband connection monthly fee',
    status: 'Approved'
  },
  {
    id: 6,
    expenseNo: 'EXP-2026-006',
    title: 'Marketing Pamphlets Printing',
    category: 'Marketing',
    amount: 8500,
    date: '2026-06-05',
    storeName: 'Branch 2',
    paymentMethod: 'Cash',
    description: 'Printing local flyers for store anniversary discount',
    status: 'Pending'
  },
  {
    id: 7,
    expenseNo: 'EXP-2026-007',
    title: 'AC Maintenance',
    category: 'Maintenance',
    amount: 4500,
    date: '2026-06-06',
    storeName: 'Main Branch',
    paymentMethod: 'UPI',
    description: 'AC servicing for showroom floor units',
    status: 'Approved'
  },
  {
    id: 8,
    expenseNo: 'EXP-2026-008',
    title: 'Store Stationery supplies',
    category: 'Office Expenses',
    amount: 1500,
    date: '2026-06-07',
    storeName: 'Branch 3',
    paymentMethod: 'Cash',
    description: 'Invoice registers, pens, and paper rolls',
    status: 'Approved'
  }
];

// Customer Dues mock data
export const MOCK_CUSTOMER_DUES = [
  {
    id: 1,
    invoiceNo: 'INV-2026-003',
    customerName: 'Amit Patel',
    phone: '+91 98765 43210',
    email: 'amit.patel@gmail.com',
    storeName: 'Main Branch',
    totalBill: 8850,
    paidAmount: 5000,
    dueAmount: 3850,
    dueDate: '2026-06-15',
    lastPaymentDate: '2026-06-02',
    status: 'Due'
  },
  {
    id: 2,
    invoiceNo: 'INV-2026-006',
    customerName: 'Anjali Desai',
    phone: '+91 99887 76655',
    email: 'anjali.desai@yahoo.com',
    storeName: 'Main Branch',
    totalBill: 7080,
    paidAmount: 4000,
    dueAmount: 3080,
    dueDate: '2026-06-18',
    lastPaymentDate: '2026-06-05',
    status: 'Due'
  },
  {
    id: 3,
    invoiceNo: 'INV-2026-010',
    customerName: 'Rohan Joshi',
    phone: '+91 91234 56789',
    email: 'rohan.joshi@outlook.com',
    storeName: 'Branch 2',
    totalBill: 4602,
    paidAmount: 2000,
    dueAmount: 2602,
    dueDate: '2026-06-20',
    lastPaymentDate: '2026-06-09',
    status: 'Due'
  },
  {
    id: 4,
    invoiceNo: 'INV-2026-012',
    customerName: 'Sanjay Dutt',
    phone: '+91 95432 10987',
    email: 'sanjay.dutt@gmail.com',
    storeName: 'Branch 3',
    totalBill: 15400,
    paidAmount: 5000,
    dueAmount: 10400,
    dueDate: '2026-06-08', // Overdue
    lastPaymentDate: '2026-05-25',
    status: 'Overdue'
  },
  {
    id: 5,
    invoiceNo: 'INV-2026-015',
    customerName: 'Meera Sen',
    phone: '+91 98112 23344',
    email: 'meera.sen@gmail.com',
    storeName: 'Admin Store',
    totalBill: 12500,
    paidAmount: 0,
    dueAmount: 12500,
    dueDate: '2026-06-25',
    lastPaymentDate: '—',
    status: 'Due'
  }
];

// Supplier Payments mock data
export const MOCK_SUPPLIER_PAYMENTS = [
  {
    id: 1,
    supplierName: 'Lens World Ltd',
    contactPerson: 'Suresh Kumar',
    phone: '+91 98223 34455',
    storeName: 'Main Branch',
    totalBilled: 145000,
    paidAmount: 115000,
    dueAmount: 30000,
    dueDate: '2026-06-25',
    status: 'Due'
  },
  {
    id: 2,
    supplierName: 'Vision Frames Wholesale',
    contactPerson: 'Harish Mehta',
    phone: '+91 97665 54433',
    storeName: 'Branch 2',
    totalBilled: 230000,
    paidAmount: 230000,
    dueAmount: 0,
    dueDate: '—',
    status: 'Paid'
  },
  {
    id: 3,
    supplierName: 'Acuvue Contact Lens Dist.',
    contactPerson: 'Mehul Shah',
    phone: '+91 91122 33445',
    storeName: 'Main Branch',
    totalBilled: 95000,
    paidAmount: 65000,
    dueAmount: 30000,
    dueDate: '2026-06-12',
    status: 'Due'
  },
  {
    id: 4,
    supplierName: 'Essilor India',
    contactPerson: 'Devendra Sharma',
    phone: '+91 90088 77665',
    storeName: 'Admin Store',
    totalBilled: 380000,
    paidAmount: 300000,
    dueAmount: 80000,
    dueDate: '2026-06-05', // Overdue
    status: 'Overdue'
  },
  {
    id: 5,
    supplierName: 'Italian Optics House',
    contactPerson: 'Gautam Singhania',
    phone: '+91 95554 43322',
    storeName: 'Branch 3',
    totalBilled: 120000,
    paidAmount: 120000,
    dueAmount: 0,
    dueDate: '—',
    status: 'Paid'
  }
];

// Central Transactions ledger (inflow & outflow combined)
export const MOCK_TRANSACTIONS = [
  {
    id: 1,
    txnId: 'TXN-2026-0001',
    date: '2026-06-01',
    description: 'Sale Invoice INV-2026-001 (Aarav Mehta)',
    type: 'Credit',
    amount: 14750,
    paymentMethod: 'UPI',
    storeName: 'Main Branch'
  },
  {
    id: 2,
    txnId: 'TXN-2026-0002',
    date: '2026-06-01',
    description: 'Store Rent Expense (EXP-2026-001)',
    type: 'Debit',
    amount: 45000,
    paymentMethod: 'Bank Transfer',
    storeName: 'Main Branch'
  },
  {
    id: 3,
    txnId: 'TXN-2026-0003',
    date: '2026-06-02',
    description: 'Sale Invoice INV-2026-002 (Priya Sharma)',
    type: 'Credit',
    amount: 11210,
    paymentMethod: 'Credit Card',
    storeName: 'Branch 2'
  },
  {
    id: 4,
    txnId: 'TXN-2026-0004',
    date: '2026-06-02',
    description: 'Electricity Bill payment (EXP-2026-002)',
    type: 'Debit',
    amount: 12500,
    paymentMethod: 'UPI',
    storeName: 'Branch 2'
  },
  {
    id: 5,
    txnId: 'TXN-2026-0005',
    date: '2026-06-03',
    description: 'Sale Invoice INV-2026-004 (Sneha Reddy)',
    type: 'Credit',
    amount: 3776,
    paymentMethod: 'UPI',
    storeName: 'Branch 3'
  },
  {
    id: 6,
    txnId: 'TXN-2026-0006',
    date: '2026-06-04',
    description: 'Partial Customer payment (Amit Patel)',
    type: 'Credit',
    amount: 5000,
    paymentMethod: 'UPI',
    storeName: 'Main Branch'
  },
  {
    id: 7,
    txnId: 'TXN-2026-0007',
    date: '2026-06-04',
    description: 'Staff Refreshments payment (EXP-2026-004)',
    type: 'Debit',
    amount: 3200,
    paymentMethod: 'Cash',
    storeName: 'Branch 3'
  },
  {
    id: 8,
    txnId: 'TXN-2026-0008',
    date: '2026-06-05',
    description: 'Sale Invoice INV-2026-005 (Vikram Singh)',
    type: 'Credit',
    amount: 5664,
    paymentMethod: 'Bank Transfer',
    storeName: 'Admin Store'
  },
  {
    id: 9,
    txnId: 'TXN-2026-0009',
    date: '2026-06-05',
    description: 'AC Maintenance invoice (EXP-2026-007)',
    type: 'Debit',
    amount: 4500,
    paymentMethod: 'UPI',
    storeName: 'Main Branch'
  },
  {
    id: 10,
    txnId: 'TXN-2026-0010',
    date: '2026-06-06',
    description: 'Partial Payment to Essilor India (Supplier)',
    type: 'Debit',
    amount: 50000,
    paymentMethod: 'Bank Transfer',
    storeName: 'Admin Store'
  }
];

// Profit & Loss Statement Detailed Mock Data
export const MOCK_PROFIT_LOSS = {
  summary: {
    grossRevenue: 984500,
    otherIncome: 12500,
    totalRevenue: 997000,
    cogs: 420000, // Cost of Goods Sold (frame/lens procurement)
    grossProfit: 577000,
    operatingExpenses: 184500,
    operatingIncome: 392500,
    taxProvision: 70650, // approx 18% GST/Income tax
    netProfit: 321850
  },
  revenueDetails: [
    { title: 'Prescription Glasses Sales', amount: 560000 },
    { title: 'Sunglasses Sales', amount: 245000 },
    { title: 'Contact Lens Sales', amount: 114500 },
    { title: 'Repair & Fitting Services', amount: 65000 },
    { title: 'Interest/Discount Earned', amount: 12500 }
  ],
  expenseDetails: [
    { title: 'Store Rents (All Branches)', amount: 95000 },
    { title: 'Staff Salary Provisions', amount: 54000 },
    { title: 'Utility Bills (Electric, Broadband)', amount: 16800 },
    { title: 'Marketing & Ad Spend', amount: 12000 },
    { title: 'AC Maintenance & Store Repair', amount: 6700 },
    { title: 'Office Supplies & Stationery', amount: 2000 }
  ],
  storeWiseProfit: [
    { storeName: 'Main Branch', revenue: 435750, expenses: 220000, profit: 215750, color: '#3B82F6' },
    { storeName: 'Branch 2', revenue: 298800, expenses: 160000, profit: 138800, color: '#10B981' },
    { storeName: 'Branch 3', revenue: 149400, expenses: 90000, profit: 59400, color: '#F59E0B' },
    { storeName: 'Admin Store', revenue: 113050, expenses: 104500, profit: 8550, color: '#6366F1' }
  ]
};

// Data for Dashboard Charts
export const DASHBOARD_CHARTS_DATA = {
  revenueOverview: [
    { label: 'Jan', value: 320000 },
    { label: 'Feb', value: 410000 },
    { label: 'Mar', value: 580000 },
    { label: 'Apr', value: 520000 },
    { label: 'May', value: 780000 },
    { label: 'Jun', value: 984500 }
  ],
  expenseBreakdown: [
    { name: 'Purchases (COGS)', value: 420000, color: '#6366F1' },
    { name: 'Rent', value: 95000, color: '#EF4444' },
    { name: 'Salaries', value: 54000, color: '#F59E0B' },
    { name: 'Utilities', value: 16800, color: '#3B82F6' },
    { name: 'Others', value: 20700, color: '#10B981' }
  ],
  profitTrend: [
    { label: 'Jan', value: 120000 },
    { label: 'Feb', value: 180000 },
    { label: 'Mar', value: 290000 },
    { label: 'Apr', value: 240000 },
    { label: 'May', value: 340000 },
    { label: 'Jun', value: 321850 }
  ],
  customerDueStatus: [
    { name: 'Paid Invoices', value: 8, color: '#10B981' },
    { name: 'Unpaid (Due)', value: 4, color: '#F59E0B' },
    { name: 'Overdue Dues', value: 1, color: '#EF4444' }
  ],
  supplierPaymentStatus: [
    { name: 'Fully Paid Suppliers', value: 2, color: '#10B981' },
    { name: 'Outstanding Balance', value: 2, color: '#F59E0B' },
    { name: 'Overdue Bills', value: 1, color: '#EF4444' }
  ],
  storeWiseRevenue: [
    { storeName: 'Main Branch', value: 435750, color: '#3B82F6' },
    { storeName: 'Branch 2', value: 298800, color: '#10B981' },
    { storeName: 'Branch 3', value: 149400, color: '#F59E0B' },
    { storeName: 'Admin Store', value: 113050, color: '#6366F1' }
  ]
};

// 1. Chart of Accounts Groups
export const MOCK_CHART_OF_ACCOUNTS = {
  Assets: [
    { code: '1010', name: 'Cash In Hand', balance: 185200, type: 'Asset' },
    { code: '1020', name: 'HDFC Bank A/c', balance: 542000, type: 'Asset' },
    { code: '1030', name: 'SBI Bank A/c', balance: 320000, type: 'Asset' },
    { code: '1040', name: 'Optical Stock (Inventory)', balance: 420000, type: 'Asset' },
    { code: '1050', name: 'Trade Debtors (Customers)', balance: 32432, type: 'Asset' }
  ],
  Liabilities: [
    { code: '2010', name: 'Trade Creditors (Suppliers)', balance: 220000, type: 'Liability' },
    { code: '2020', name: 'Business Loan (SBI)', balance: 150000, type: 'Liability' },
    { code: '2030', name: 'GST Payable', balance: 24700, type: 'Liability' }
  ],
  Income: [
    { code: '3010', name: 'Sales Revenue (Eyewear)', balance: 984500, type: 'Income' },
    { code: '3020', name: 'Fitting Charges & Services', balance: 65000, type: 'Income' },
    { code: '3030', name: 'Other Miscellaneous Income', balance: 12500, type: 'Income' }
  ],
  Expenses: [
    { code: '4010', name: 'Inventory Procurement (Purchase)', balance: 420000, type: 'Expense' },
    { code: '4020', name: 'Store Rent Expense', balance: 95000, type: 'Expense' },
    { code: '4030', name: 'Employee Salaries', balance: 54000, type: 'Expense' },
    { code: '4040', name: 'Electricity & Internet (Utilities)', balance: 16800, type: 'Expense' },
    { code: '4055', name: 'Marketing & Advertising', balance: 12000, type: 'Expense' },
    { code: '4060', name: 'Miscellaneous Expenses', balance: 6700, type: 'Expense' }
  ]
};

// 2. General Ledger list
export const MOCK_GENERAL_LEDGER = [
  { id: 1, date: '2026-06-01', voucherNo: 'JV-2026-001', account: 'Cash In Hand', description: 'Cash sales collection from Aarav Mehta', debit: 14750, credit: 0, balance: 164750 },
  { id: 2, date: '2026-06-01', voucherNo: 'JV-2026-001', account: 'Sales Revenue', description: 'Sales record from INV-2026-001', debit: 0, credit: 14750, balance: 984500 },
  { id: 3, date: '2026-06-02', voucherNo: 'JV-2026-002', account: 'Store Rent Expense', description: 'Rent paid for Main Branch', debit: 45000, credit: 0, balance: 95000 },
  { id: 4, date: '2026-06-02', voucherNo: 'JV-2026-002', account: 'HDFC Bank A/c', description: 'Rent payment June 2026', debit: 0, credit: 45000, balance: 805000 },
  { id: 5, date: '2026-06-03', voucherNo: 'JV-2026-003', account: 'Electricity Expense', description: 'Electric charges paid via UPI', debit: 12500, credit: 0, balance: 16800 },
  { id: 6, date: '2026-06-03', voucherNo: 'JV-2026-003', account: 'SBI Bank A/c', description: 'Electricity bill settlement', debit: 0, credit: 12500, balance: 307500 },
  { id: 7, date: '2026-06-04', voucherNo: 'JV-2026-004', account: 'Trade Creditors', description: 'Paid Lens World Ltd partial amount', debit: 30000, credit: 0, balance: 190000 },
  { id: 8, date: '2026-06-04', voucherNo: 'JV-2026-004', account: 'HDFC Bank A/c', description: 'NEFT to Lens World Ltd', debit: 0, credit: 30000, balance: 775000 },
  { id: 9, date: '2026-06-05', voucherNo: 'JV-2026-005', account: 'HDFC Bank A/c', description: 'UPI collection from Amit Patel', debit: 5000, credit: 0, balance: 780000 },
  { id: 10, date: '2026-06-05', voucherNo: 'JV-2026-005', account: 'Trade Debtors', description: 'UPI collection from Amit Patel', debit: 0, credit: 5000, balance: 27432 }
];

// 3. Journal Entries list
export const MOCK_JOURNAL_ENTRIES = [
  { id: 1, date: '2026-06-01', voucherNo: 'JV-2026-001', debitAccount: 'Cash In Hand', creditAccount: 'Sales Revenue', amount: 14750, narration: 'Being cash sales collection for invoice INV-2026-001' },
  { id: 2, date: '2026-06-02', voucherNo: 'JV-2026-002', debitAccount: 'Store Rent Expense', creditAccount: 'HDFC Bank A/c', amount: 45000, narration: 'Being rent paid for Downtown premises for June 2026' },
  { id: 3, date: '2026-06-03', voucherNo: 'JV-2026-003', debitAccount: 'Utilities (Electricity)', creditAccount: 'SBI Bank A/c', amount: 12500, narration: 'Being electric charges settled for West End Branch' },
  { id: 4, date: '2026-06-04', voucherNo: 'JV-2026-004', debitAccount: 'Trade Creditors (Lens World)', creditAccount: 'HDFC Bank A/c', amount: 30000, narration: 'Being part-payment processed to supplier' },
  { id: 5, date: '2026-06-05', voucherNo: 'JV-2026-005', debitAccount: 'HDFC Bank A/c', creditAccount: 'Trade Debtors (Amit Patel)', amount: 5000, narration: 'Being outstanding collection received via UPI' },
  { id: 6, date: '2026-06-06', voucherNo: 'JV-2026-006', debitAccount: 'Employee Salaries', creditAccount: 'HDFC Bank A/c', amount: 54000, narration: 'Being branch staff salaries disbursed for May 2026' },
  { id: 7, date: '2026-06-07', voucherNo: 'JV-2026-007', debitAccount: 'Marketing Expense', creditAccount: 'Cash In Hand', amount: 8500, narration: 'Being cash spent on local distribution flyers' }
];

// 4. Cash Book
export const MOCK_CASH_BOOK = [
  { id: 1, date: '2026-06-01', reference: 'Opening Cash Balance', cashIn: 150000, cashOut: 0, balance: 150000 },
  { id: 2, date: '2026-06-01', reference: 'Invoice INV-2026-003 Cash Collection', cashIn: 5000, cashOut: 0, balance: 155000 },
  { id: 3, date: '2026-06-02', reference: 'Office Stationery EXP-2026-008', cashIn: 0, cashOut: 1500, balance: 153500 },
  { id: 4, date: '2026-06-04', reference: 'Flyers Printing Cash Expense JV-2026-007', cashIn: 0, cashOut: 8500, balance: 145000 },
  { id: 5, date: '2026-06-05', reference: 'Invoice INV-2026-006 Cash Pay', cashIn: 4000, cashOut: 0, balance: 149000 },
  { id: 6, date: '2026-06-06', reference: 'AC maintenance service EXP-2026-007', cashIn: 0, cashOut: 4500, balance: 144500 },
  { id: 7, date: '2026-06-07', reference: 'Staff Refreshments Cash EXP-2026-004', cashIn: 0, cashOut: 3200, balance: 141300 },
  { id: 8, date: '2026-06-09', reference: 'Invoice INV-2026-010 Partial Cash Recd', cashIn: 2000, cashOut: 0, balance: 143300 }
];

// 5. Bank Book
export const MOCK_BANK_BOOK = [
  { id: 1, date: '2026-06-01', reference: 'Opening Bank Balance', credit: 850000, debit: 0, balance: 850000 },
  { id: 2, date: '2026-06-01', reference: 'INV-2026-001 UPI Receipt', credit: 14750, debit: 0, balance: 864750 },
  { id: 3, date: '2026-06-01', reference: 'Store Rent June Chq 09102', credit: 0, debit: 45000, balance: 819750 },
  { id: 4, date: '2026-06-02', reference: 'INV-2026-002 Card Settlement', credit: 11210, debit: 0, balance: 830960 },
  { id: 5, date: '2026-06-03', reference: 'Electricity Bill UPI Pay', credit: 0, debit: 12500, balance: 818460 },
  { id: 6, date: '2026-06-04', reference: 'Supplier Lens World NEFT Transfer', credit: 0, debit: 30000, balance: 788460 },
  { id: 7, date: '2026-06-05', reference: 'Disburse Salaries NEFT', credit: 0, debit: 54000, balance: 734460 },
  { id: 8, date: '2026-06-07', reference: 'INV-2026-007 UPI Collection', credit: 12980, debit: 0, balance: 747440 },
  { id: 9, date: '2026-06-08', reference: 'INV-2026-008 Card settlement', credit: 9676, debit: 0, balance: 757116 }
];

// 6. Trial Balance list
export const MOCK_TRIAL_BALANCE = [
  { accountName: 'Capital Account', debit: 0, credit: 500000 },
  { accountName: 'Cash In Hand', debit: 185200, credit: 0 },
  { accountName: 'HDFC Bank Account', debit: 542000, credit: 0 },
  { accountName: 'SBI Bank Account', debit: 320000, credit: 0 },
  { accountName: 'Stock-In-Trade (Inventory)', debit: 420000, credit: 0 },
  { accountName: 'Sundry Debtors (Customers)', debit: 32432, credit: 0 },
  { accountName: 'Sundry Creditors (Suppliers)', debit: 0, credit: 220000 },
  { accountName: 'Unsecured Business Loans', debit: 0, credit: 150000 },
  { accountName: 'GST Payable', debit: 0, credit: 24700 },
  { accountName: 'Sales Revenue', debit: 0, credit: 984500 },
  { accountName: 'Fitting Charges & Services', debit: 0, credit: 65000 },
  { accountName: 'Other Miscellaneous Income', debit: 0, credit: 12500 },
  { accountName: 'Purchases (COGS)', debit: 420000, credit: 0 },
  { accountName: 'Store Rents OPEX', debit: 95000, credit: 0 },
  { accountName: 'Employee Salaries', debit: 54000, credit: 0 },
  { accountName: 'Utility Bills', debit: 16800, credit: 0 },
  { accountName: 'Marketing Expense', debit: 12000, credit: 0 },
  { accountName: 'General Store Repairs', debit: 6700, credit: 0 },
  { accountName: 'Stationery & Printing', debit: 2000, credit: 0 }
];

// 7. GST Reports details
export const MOCK_GST_LEDGER = [
  { id: 1, date: '2026-06-01', type: 'Sales (GSTR-1)', invoiceNo: 'INV-2026-001', counterParty: 'Aarav Mehta', rate: '18%', taxableValue: 12500, cgst: 1125, sgst: 1125, igst: 0, total: 2250, status: 'Filed' },
  { id: 2, date: '2026-06-02', type: 'Sales (GSTR-1)', invoiceNo: 'INV-2026-002', counterParty: 'Priya Sharma', rate: '18%', taxableValue: 9500, cgst: 855, sgst: 855, igst: 0, total: 1710, status: 'Filed' },
  { id: 3, date: '2026-06-02', type: 'Purchase (GSTR-2)', invoiceNo: 'PUR-2026-104', counterParty: 'Lens World Ltd', rate: '18%', taxableValue: 50000, cgst: 4500, sgst: 4500, igst: 0, total: 9000, status: 'Reconciled' },
  { id: 4, date: '2026-06-03', type: 'Sales (GSTR-1)', invoiceNo: 'INV-2026-004', counterParty: 'Sneha Reddy', rate: '18%', taxableValue: 3200, cgst: 288, sgst: 288, igst: 0, total: 576, status: 'Filed' },
  { id: 5, date: '2026-06-05', type: 'Sales (GSTR-1)', invoiceNo: 'INV-2026-005', counterParty: 'Vikram Singh', rate: '18%', taxableValue: 4800, cgst: 432, sgst: 432, igst: 0, total: 864, status: 'Filed' },
  { id: 6, date: '2026-06-06', type: 'Purchase (GSTR-2)', invoiceNo: 'PUR-2026-109', counterParty: 'Vision Frames', rate: '18%', taxableValue: 25000, cgst: 2250, sgst: 2250, igst: 0, total: 4500, status: 'Reconciled' },
  { id: 7, date: '2026-06-06', type: 'Sales (GSTR-1)', invoiceNo: 'INV-2026-007', counterParty: 'Rajesh Kumar', rate: '18%', taxableValue: 11000, cgst: 990, sgst: 990, igst: 0, total: 1980, status: 'Filed' },
  { id: 8, date: '2026-06-07', type: 'Sales (GSTR-1)', invoiceNo: 'INV-2026-008', counterParty: 'Karan Malhotra', rate: '18%', taxableValue: 8200, cgst: 738, sgst: 738, igst: 0, total: 1476, status: 'Filed' },
  { id: 9, date: '2026-06-08', type: 'Sales (GSTR-1)', invoiceNo: 'INV-2026-009', counterParty: 'Neha Gupta', rate: '18%', taxableValue: 18500, cgst: 1665, sgst: 1665, igst: 0, total: 3330, status: 'Pending' }
];

export const MOCK_GSTR1_SUMMARY = {
  totalOutwardB2B: 4,
  totalOutwardB2C: 5,
  taxableValue: 71700,
  cgst: 6453,
  sgst: 6453,
  igst: 0,
  totalTax: 12906
};

export const MOCK_GSTR2_SUMMARY = {
  totalInwardInvoices: 2,
  taxableValue: 75000,
  cgst: 6750,
  sgst: 6750,
  igst: 0,
  totalITC: 13500
};

// Payment Collection Records
export const MOCK_PAYMENT_COLLECTIONS = [
  { id: 1, customerName: 'Amit Patel', invoiceNo: 'INV-2026-003', paymentAmount: 5000, paymentDate: '2026-06-04', paymentMethod: 'UPI', collectedBy: 'Ravi Kumar', storeName: 'Main Branch', notes: 'Partial payment received against invoice INV-2026-003' },
  { id: 2, customerName: 'Anjali Desai', invoiceNo: 'INV-2026-006', paymentAmount: 4000, paymentDate: '2026-06-05', paymentMethod: 'Cash', collectedBy: 'Sunil Verma', storeName: 'Main Branch', notes: 'Cash collected at store counter' },
  { id: 3, customerName: 'Rohan Joshi', invoiceNo: 'INV-2026-010', paymentAmount: 2000, paymentDate: '2026-06-09', paymentMethod: 'UPI', collectedBy: 'Meena Sharma', storeName: 'Branch 2', notes: 'UPI partial payment against pending dues' },
  { id: 4, customerName: 'Aarav Mehta', invoiceNo: 'INV-2026-001', paymentAmount: 14750, paymentDate: '2026-06-01', paymentMethod: 'UPI', collectedBy: 'Ravi Kumar', storeName: 'Main Branch', notes: 'Full payment collected at time of sale' },
  { id: 5, customerName: 'Priya Sharma', invoiceNo: 'INV-2026-002', paymentAmount: 11210, paymentDate: '2026-06-02', paymentMethod: 'Credit Card', collectedBy: 'Meena Sharma', storeName: 'Branch 2', notes: 'Credit card payment via POS machine' },
  { id: 6, customerName: 'Sneha Reddy', invoiceNo: 'INV-2026-004', paymentAmount: 3776, paymentDate: '2026-06-03', paymentMethod: 'UPI', collectedBy: 'Deepak Tiwari', storeName: 'Branch 3', notes: 'Full payment via Google Pay' },
  { id: 7, customerName: 'Vikram Singh', invoiceNo: 'INV-2026-005', paymentAmount: 5664, paymentDate: '2026-06-04', paymentMethod: 'Bank Transfer', collectedBy: 'Admin Staff', storeName: 'Admin Store', notes: 'NEFT transfer from corporate account' },
  { id: 8, customerName: 'Rajesh Kumar', invoiceNo: 'INV-2026-007', paymentAmount: 12980, paymentDate: '2026-06-06', paymentMethod: 'UPI', collectedBy: 'Meena Sharma', storeName: 'Branch 2', notes: 'Payment via PhonePe' },
  { id: 9, customerName: 'Karan Malhotra', invoiceNo: 'INV-2026-008', paymentAmount: 9676, paymentDate: '2026-06-07', paymentMethod: 'Credit Card', collectedBy: 'Deepak Tiwari', storeName: 'Branch 3', notes: 'Visa card payment at counter' },
  { id: 10, customerName: 'Neha Gupta', invoiceNo: 'INV-2026-009', paymentAmount: 21830, paymentDate: '2026-06-08', paymentMethod: 'UPI', collectedBy: 'Ravi Kumar', storeName: 'Main Branch', notes: 'Full amount settled via UPI' },
  { id: 11, customerName: 'Sanjay Dutt', invoiceNo: 'INV-2026-012', paymentAmount: 5000, paymentDate: '2026-05-25', paymentMethod: 'Cash', collectedBy: 'Deepak Tiwari', storeName: 'Branch 3', notes: 'Partial cash collection against overdue invoice' },
  { id: 12, customerName: 'Meera Sen', invoiceNo: 'INV-2026-015', paymentAmount: 0, paymentDate: '—', paymentMethod: '—', collectedBy: '—', storeName: 'Admin Store', notes: 'No payment collected yet' }
];

// Refunds & Adjustments Records
export const MOCK_REFUNDS = [
  { id: 1, refundNo: 'REF-2026-001', customerName: 'Aarav Mehta', invoiceNo: 'INV-2026-001', refundAmount: 2500, reason: 'Lens prescription mismatch', date: '2026-06-05', status: 'Completed', storeName: 'Main Branch', processedBy: 'Ravi Kumar', method: 'UPI' },
  { id: 2, refundNo: 'REF-2026-002', customerName: 'Priya Sharma', invoiceNo: 'INV-2026-002', refundAmount: 1500, reason: 'Frame color exchange — price difference', date: '2026-06-06', status: 'Completed', storeName: 'Branch 2', processedBy: 'Meena Sharma', method: 'Credit Card' },
  { id: 3, refundNo: 'REF-2026-003', customerName: 'Karan Malhotra', invoiceNo: 'INV-2026-008', refundAmount: 3200, reason: 'Defective coating on lenses', date: '2026-06-09', status: 'Pending', storeName: 'Branch 3', processedBy: 'Deepak Tiwari', method: 'Bank Transfer' },
  { id: 4, refundNo: 'REF-2026-004', customerName: 'Neha Gupta', invoiceNo: 'INV-2026-009', refundAmount: 5000, reason: 'Customer returned unused sunglasses', date: '2026-06-10', status: 'Completed', storeName: 'Main Branch', processedBy: 'Ravi Kumar', method: 'UPI' },
  { id: 5, refundNo: 'REF-2026-005', customerName: 'Vikram Singh', invoiceNo: 'INV-2026-005', refundAmount: 800, reason: 'Billing adjustment — GST recalculation', date: '2026-06-11', status: 'Completed', storeName: 'Admin Store', processedBy: 'Admin Staff', method: 'Bank Transfer' },
  { id: 6, refundNo: 'REF-2026-006', customerName: 'Rajesh Kumar', invoiceNo: 'INV-2026-007', refundAmount: 2200, reason: 'Wrong frame delivered — exchange credit', date: '2026-06-12', status: 'Pending', storeName: 'Branch 2', processedBy: 'Meena Sharma', method: 'Cash' },
  { id: 7, refundNo: 'REF-2026-007', customerName: 'Sneha Reddy', invoiceNo: 'INV-2026-004', refundAmount: 576, reason: 'Duplicate GST charge reversal', date: '2026-06-13', status: 'Cancelled', storeName: 'Branch 3', processedBy: 'Deepak Tiwari', method: 'UPI' }
];

// Store Performance Metrics
export const MOCK_STORE_PERFORMANCE = [
  { id: 1, storeName: 'Main Branch', location: 'Downtown', revenue: 435750, expenses: 220000, profit: 215750, orders: 142, customers: 98, gstCollected: 39218, color: '#3B82F6' },
  { id: 2, storeName: 'Branch 2', location: 'West End', revenue: 298800, expenses: 160000, profit: 138800, orders: 97, customers: 72, gstCollected: 26892, color: '#10B981' },
  { id: 3, storeName: 'Branch 3', location: 'Metro Station', revenue: 149400, expenses: 90000, profit: 59400, orders: 58, customers: 41, gstCollected: 13446, color: '#F59E0B' },
  { id: 4, storeName: 'Admin Store', location: 'Corporate Office', revenue: 113050, expenses: 104500, profit: 8550, orders: 34, customers: 25, gstCollected: 10175, color: '#6366F1' }
];

// GST Collection Trend for Dashboard
export const DASHBOARD_GST_TREND = [
  { label: 'Jan', value: 28000 },
  { label: 'Feb', value: 36900 },
  { label: 'Mar', value: 52200 },
  { label: 'Apr', value: 46800 },
  { label: 'May', value: 70200 },
  { label: 'Jun', value: 89731 }
];

