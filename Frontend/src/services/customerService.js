import { MOCK_CUSTOMERS } from '../data/customersData';

// Helper to generate order numbers in the format ORD-YYYYMMDD-XXXX
export const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  return `ORD-${dateStr}-${rand}`;
};

export const getCustomers = () => {
  const saved = localStorage.getItem('shopkeeper_customers');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse customers from localStorage', e);
    }
  }
  // Initialize with mock data if empty
  localStorage.setItem('shopkeeper_customers', JSON.stringify(MOCK_CUSTOMERS));
  return MOCK_CUSTOMERS;
};

export const saveCustomer = (customerData, cartItems, prescription, paymentInfo, orderStatus = 'Pending', createdBy = 'Shopkeeper') => {
  const customers = getCustomers();
  const now = new Date().toISOString().split('T')[0];
  const orderId = generateOrderNumber();

  // Create order items list
  const orderItems = cartItems.map((item) => ({
    productId: item.product.id,
    productName: item.product.product_name,
    frameName: item.product.product_name, // fallback for legacy
    brand: item.product.brand,
    category: item.product.category,
    subcategory: item.product.subcategory,
    quantity: item.quantity,
    price: item.product.selling_price,
    amount: item.product.selling_price * item.quantity,
    selectedColor: item.selectedColor,
    selectedSize: item.selectedSize,
  }));

  const subtotal = cartItems.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0);
  const discount = Number(paymentInfo.discount) || 0;
  const finalAmount = Math.max(0, subtotal - discount);

  // Outstanding balance calculation
  let outstandingBalance = 0;
  if (paymentInfo.status === 'Partial') {
    outstandingBalance = Number(paymentInfo.remainingAmount) || 0;
  } else if (paymentInfo.status === 'Unpaid') {
    outstandingBalance = finalAmount;
  }

  const newOrder = {
    id: orderId,
    date: now,
    items: orderItems,
    subtotal,
    discount,
    amount: finalAmount, // Grand total
    status: orderStatus, // Pending, In Progress, Ready, Delivered
    paymentMethod: paymentInfo.method, // Cash, UPI
    paymentStatus: paymentInfo.status, // Paid, Partial, Unpaid
    receivedAmount: paymentInfo.method === 'Cash' ? Number(paymentInfo.receivedAmount) || 0 : (paymentInfo.status === 'Paid' ? finalAmount : 0),
    remainingAmount: outstandingBalance,
    upiId: paymentInfo.upiId || '',
    createdBy,
  };

  let targetCustomer = null;
  const isExisting = customerData.id && customers.some(c => String(c.id) === String(customerData.id));

  if (isExisting) {
    // Update existing customer
    customers.forEach((c) => {
      if (String(c.id) === String(customerData.id)) {
        // Update contact/personal info
        c.firstName = customerData.firstName;
        c.lastName = customerData.lastName;
        c.email = customerData.email;
        c.phone = customerData.phone;
        c.dateOfBirth = customerData.dateOfBirth;
        c.gender = customerData.gender;
        c.address = customerData.address;
        c.city = customerData.city;
        c.state = customerData.state;
        c.pincode = customerData.pincode;
        c.remark = customerData.remark;
        c.lastVisit = now;

        // Prescription handling
        if (prescription && prescription.prescriptionDate) {
          c.prescription = prescription;
          if (!c.prescriptionHistory) c.prescriptionHistory = [];
          c.prescriptionHistory.unshift(prescription);
        }

        // Order appending
        if (!c.orders) c.orders = [];
        c.orders.unshift(newOrder);
        c.totalOrders = c.orders.length;
        c.totalAmount = (c.totalAmount || 0) + finalAmount;
        c.outstandingBalance = (c.outstandingBalance || 0) + outstandingBalance;

        // History logs
        if (!c.history) c.history = [];
        c.history.unshift({
          date: now,
          event: 'New Order Created',
          description: `Order ${orderId} placed for ${cartItems.length} product(s). Total: ₹${finalAmount.toLocaleString('en-IN')}`,
        });

        if (prescription && prescription.prescriptionDate) {
          c.history.unshift({
            date: now,
            event: 'Prescription Updated',
            description: `Prescription updated by ${prescription.doctorName || 'Optician'} during order`,
          });
        }

        targetCustomer = c;
      }
    });
  } else {
    // Create new customer
    const newCustId = Date.now();
    const history = [
      { date: now, event: 'Customer Created', description: 'Customer profile created in the system' },
      {
        date: now,
        event: 'New Order Created',
        description: `Order ${orderId} placed for ${cartItems.length} product(s). Total: ₹${finalAmount.toLocaleString('en-IN')}`,
      },
    ];

    if (prescription && prescription.prescriptionDate) {
      history.unshift({
        date: now,
        event: 'Eye Test Completed',
        description: `Optical prescription recorded by ${prescription.doctorName || 'Optician'}`,
      });
    }

    targetCustomer = {
      id: newCustId,
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      email: customerData.email,
      phone: customerData.phone,
      dateOfBirth: customerData.dateOfBirth,
      gender: customerData.gender,
      address: customerData.address,
      city: customerData.city,
      state: customerData.state,
      pincode: customerData.pincode,
      status: 'Active',
      customerSince: now,
      lastVisit: now,
      remark: customerData.remark,
      totalOrders: 1,
      totalAmount: finalAmount,
      outstandingBalance: outstandingBalance,
      prescription: prescription && prescription.prescriptionDate ? prescription : null,
      prescriptionHistory: prescription && prescription.prescriptionDate ? [prescription] : [],
      orders: [newOrder],
      history: history,
    };

    customers.unshift(targetCustomer);
  }

  localStorage.setItem('shopkeeper_customers', JSON.stringify(customers));
  return targetCustomer;
};

export const updateOrderStatus = (customerId, orderId, newStatus) => {
  const customers = getCustomers();
  const now = new Date().toISOString().split('T')[0];

  customers.forEach((c) => {
    if (String(c.id) === String(customerId)) {
      c.orders = c.orders.map((order) => {
        if (order.id === orderId) {
          if (order.status !== newStatus) {
            order.status = newStatus;
            c.history.unshift({
              date: now,
              event: 'Order Status Updated',
              description: `Order ${orderId} status changed to ${newStatus}`,
            });
          }
        }
        return order;
      });
    }
  });

  localStorage.setItem('shopkeeper_customers', JSON.stringify(customers));
};

export const updatePaymentStatus = (customerId, orderId, newStatus, additionalPaidAmount = 0) => {
  const customers = getCustomers();
  const now = new Date().toISOString().split('T')[0];

  customers.forEach((c) => {
    if (String(c.id) === String(customerId)) {
      c.orders = c.orders.map((order) => {
        if (order.id === orderId) {
          order.paymentStatus = newStatus;
          if (newStatus === 'Paid') {
            c.outstandingBalance = Math.max(0, (c.outstandingBalance || 0) - order.remainingAmount);
            order.receivedAmount = order.amount;
            order.remainingAmount = 0;
          } else if (newStatus === 'Partial') {
            const added = Number(additionalPaidAmount) || 0;
            order.receivedAmount += added;
            order.remainingAmount = Math.max(0, order.remainingAmount - added);
            c.outstandingBalance = Math.max(0, (c.outstandingBalance || 0) - added);
            if (order.remainingAmount === 0) {
              order.paymentStatus = 'Paid';
            }
          } else if (newStatus === 'Unpaid') {
            c.outstandingBalance = (c.outstandingBalance || 0) + (order.amount - order.remainingAmount);
            order.receivedAmount = 0;
            order.remainingAmount = order.amount;
          }
          c.history.unshift({
            date: now,
            event: 'Payment Status Updated',
            description: `Order ${orderId} payment status changed to ${newStatus}`,
          });
        }
        return order;
      });
    }
  });

  localStorage.setItem('shopkeeper_customers', JSON.stringify(customers));
};

export const getDashboardStats = () => {
  const customers = getCustomers();

  let totalSales = 0;
  let totalOrders = 0;
  let revenue = 0;
  const activeCount = customers.filter(c => c.status === 'Active' || c.status === 'VIP').length;

  const allOrders = [];

  customers.forEach((c) => {
    if (c.orders) {
      c.orders.forEach((o) => {
        totalSales += o.amount;
        totalOrders += 1;

        // Dynamic revenue calculation considering payment status
        if (o.paymentStatus === 'Paid') {
          revenue += o.amount;
        } else if (o.paymentStatus === 'Partial') {
          revenue += (o.receivedAmount || 0);
        } // Unpaid adds 0

        allOrders.push({
          id: o.id,
          customer: `${c.firstName} ${c.lastName}`,
          product: o.items?.[0]?.productName || 'Optical Items',
          amount: `₹${o.amount.toLocaleString('en-IN')}`,
          status: o.status,
          date: o.date,
        });
      });
    }
  });

  // Sort orders by date descending
  allOrders.sort((a, b) => b.date.localeCompare(a.date));
  const recentOrders = allOrders.slice(0, 5);

  // Compile top products sold
  const productSales = {};
  customers.forEach((c) => {
    if (c.orders) {
      c.orders.forEach((o) => {
        if (o.items) {
          o.items.forEach((item) => {
            const name = item.productName;
            if (!productSales[name]) {
              productSales[name] = { name, category: item.category, sold: 0, revenue: 0 };
            }
            productSales[name].sold += item.quantity;
            productSales[name].revenue += item.price * item.quantity;
          });
        }
      });
    }
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 4)
    .map((p) => ({
      name: p.name,
      category: p.category,
      sold: p.sold,
      revenue: `₹${p.revenue.toLocaleString('en-IN')}`,
    }));

  return {
    totalSales: `₹${totalSales.toLocaleString('en-IN')}`,
    totalOrders: String(totalOrders),
    revenue: `₹${revenue.toLocaleString('en-IN')}`,
    activeCustomers: String(activeCount),
    recentOrders,
    topProducts,
  };
};
