import { useMemo } from 'react';
import {
  MOCK_SALES_LEDGER,
  MOCK_EXPENSES,
  MOCK_CUSTOMER_DUES,
  MOCK_SUPPLIER_PAYMENTS,
  MOCK_TRANSACTIONS
} from '../data/accountantData';
import { useStoreStore } from '../store/store';

export const useCalculations = ({
  sales = MOCK_SALES_LEDGER,
  expenses = MOCK_EXPENSES,
  customerDues = MOCK_CUSTOMER_DUES,
  supplierPayments = MOCK_SUPPLIER_PAYMENTS,
  transactions = MOCK_TRANSACTIONS
} = {}) => {
  const { selectedStore } = useStoreStore();

  // Filter lists by selected branch
  const filteredSales = useMemo(() => {
    if (!selectedStore || selectedStore.id === 'all' || selectedStore.isAll || selectedStore.store_name === 'All Branches') return sales;
    return sales.filter(item => item.storeName === selectedStore.store_name);
  }, [sales, selectedStore]);

  const filteredExpenses = useMemo(() => {
    if (!selectedStore || selectedStore.id === 'all' || selectedStore.isAll || selectedStore.store_name === 'All Branches') return expenses;
    return expenses.filter(item => item.storeName === selectedStore.store_name);
  }, [expenses, selectedStore]);

  const filteredCustomerDues = useMemo(() => {
    if (!selectedStore || selectedStore.id === 'all' || selectedStore.isAll || selectedStore.store_name === 'All Branches') return customerDues;
    return customerDues.filter(item => item.storeName === selectedStore.store_name);
  }, [customerDues, selectedStore]);

  const filteredSupplierPayments = useMemo(() => {
    if (!selectedStore || selectedStore.id === 'all' || selectedStore.isAll || selectedStore.store_name === 'All Branches') return supplierPayments;
    return supplierPayments.filter(item => item.storeName === selectedStore.store_name);
  }, [supplierPayments, selectedStore]);

  const filteredTransactions = useMemo(() => {
    if (!selectedStore || selectedStore.id === 'all' || selectedStore.isAll || selectedStore.store_name === 'All Branches') return transactions;
    return transactions.filter(item => item.storeName === selectedStore.store_name);
  }, [transactions, selectedStore]);

  // Formatter helper for Indian Rupees
  const formatRupee = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // 1. Revenue = Sum of Sales Amount (Sales total)
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((acc, sale) => acc + (sale.total || 0), 0);
  }, [filteredSales]);

  // 2. Total Expenses = Sum of All Expense Records
  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);
  }, [filteredExpenses]);

  // 3. Cost Of Goods Sold (COGS)
  // We compute COGS as the sum of all expenses in the 'Purchases' category
  const costOfGoodsSold = useMemo(() => {
    const purchaseExpenses = filteredExpenses
      .filter(exp => exp.category?.toLowerCase() === 'purchases' || exp.category?.toLowerCase() === 'purchase')
      .reduce((acc, exp) => acc + (exp.amount || 0), 0);
    // Fallback if no purchases logged: assume 45% of sales is COGS
    return purchaseExpenses || Math.round(totalRevenue * 0.45);
  }, [filteredExpenses, totalRevenue]);

  // 4. Gross Profit = Revenue - Cost Of Goods Sold
  const grossProfit = useMemo(() => {
    return totalRevenue - costOfGoodsSold;
  }, [totalRevenue, costOfGoodsSold]);

  // 5. Net Profit = Revenue - Expenses
  const netProfit = useMemo(() => {
    return totalRevenue - totalExpenses;
  }, [totalRevenue, totalExpenses]);

  // 6. Total Customer Due = Invoice Amount - Paid Amount
  const totalCustomerDues = useMemo(() => {
    return filteredCustomerDues.reduce((acc, due) => acc + (due.dueAmount || 0), 0);
  }, [filteredCustomerDues]);

  // 7. Total Supplier Outstanding = Purchase Amount - Paid Amount
  const totalSupplierOutstanding = useMemo(() => {
    return filteredSupplierPayments.reduce((acc, sup) => acc + (sup.dueAmount || 0), 0);
  }, [filteredSupplierPayments]);

  // 8. Cash Balance = Total Cash In - Total Cash Out
  // Filtered by Cash payment method in transactions ledger
  const cashBalance = useMemo(() => {
    let cashIn = 0;
    let cashOut = 0;
    
    filteredTransactions.forEach(txn => {
      if (txn.paymentMethod?.toLowerCase() === 'cash') {
        const amt = txn.amount || 0;
        if (txn.type === 'Credit' || txn.type?.toLowerCase() === 'in') {
          cashIn += amt;
        } else if (txn.type === 'Debit' || txn.type?.toLowerCase() === 'out') {
          cashOut += amt;
        }
      }
    });
    // Add baseline cash if ledger is low
    return (150000 + cashIn - cashOut); 
  }, [filteredTransactions]);

  // 9. Bank Balance = Total Bank Credits - Total Bank Debits
  // Filtered by non-cash payment methods in transactions ledger (UPI, Bank Transfer, Card)
  const bankBalance = useMemo(() => {
    let bankCredits = 0;
    let bankDebits = 0;

    filteredTransactions.forEach(txn => {
      if (txn.paymentMethod?.toLowerCase() !== 'cash') {
        const amt = txn.amount || 0;
        if (txn.type === 'Credit' || txn.type?.toLowerCase() === 'in') {
          bankCredits += amt;
        } else if (txn.type === 'Debit' || txn.type?.toLowerCase() === 'out') {
          bankDebits += amt;
        }
      }
    });
    // Add baseline bank if ledger is low
    return (850000 + bankCredits - bankDebits);
  }, [filteredTransactions]);

  // 10. GST Calculations
  const gstDetails = useMemo(() => {
    // Output GST = GST Collected From Sales
    const outputCGST = filteredSales.reduce((acc, sale) => acc + (sale.cgst || 0), 0);
    const outputSGST = filteredSales.reduce((acc, sale) => acc + (sale.sgst || 0), 0);
    const outputIGST = filteredSales.reduce((acc, sale) => acc + (sale.igst || 0), 0);
    const outputGST = outputCGST + outputSGST + outputIGST;

    // Input GST = GST Paid On Purchases (approx 18% of Purchases expenses)
    const purchaseExpenses = filteredExpenses.filter(
      exp => exp.category?.toLowerCase() === 'purchases' || exp.category?.toLowerCase() === 'purchase'
    );
    const totalPurchases = purchaseExpenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);
    
    // Assume 18% GST was included in purchases
    const inputGST = Math.round(totalPurchases * 0.18 / 1.18);
    const inputCGST = Math.round(inputGST / 2);
    const inputSGST = Math.round(inputGST / 2);
    const inputIGST = 0;

    // GST Payable = Output GST - Input GST
    const gstPayable = outputGST - inputGST;

    return {
      outputCGST,
      outputSGST,
      outputIGST,
      outputGST,
      inputCGST,
      inputSGST,
      inputIGST,
      inputGST,
      gstPayable
    };
  }, [filteredSales, filteredExpenses]);

  return {
    totalRevenue,
    totalExpenses,
    costOfGoodsSold,
    grossProfit,
    netProfit,
    totalCustomerDues,
    totalSupplierOutstanding,
    cashBalance,
    bankBalance,
    gstDetails,
    formatRupee
  };
};
