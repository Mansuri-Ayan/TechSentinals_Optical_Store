/* ─────────────────────────────────────────────────────────
   LOYALTY MODULE MOCK DATA & STORAGE UTILITY
───────────────────────────────────────────────────────── */

export const TIERS = {
  SILVER: { name: 'Silver', min: 1, max: 5000, benefits: ['Basic Membership', 'Birthday Offers'] },
  GOLD: { name: 'Gold', min: 5001, max: 15000, benefits: ['Priority Service', 'Special Discounts'] },
  PLATINUM: { name: 'Platinum', min: 15001, max: Infinity, benefits: ['VIP Membership', 'Premium Benefits'] },
};

export const REWARDS = [
  { id: 'R1', points: 1000, label: '₹100 Voucher', description: 'Get a ₹100 discount voucher on your next purchase.' },
  { id: 'R2', points: 2500, label: 'Free Eye Checkup', description: 'Comprehensive eye examination with our senior optometrist.' },
  { id: 'R3', points: 5000, label: 'Premium Membership Gift', description: 'Receive an exclusive premium accessory package.' },
];

const DEFAULT_POINTS_CONFIG = {
  Frames: 50,
  Lenses: 30,
  Accessories: 20,
  Sunglasses: 40,
  'Contact Lens': 25,
};

const DEFAULT_CUSTOMERS = [
  {
    id: 1,
    name: 'Rajesh Kumar',
    phone: '+91 98765 43210',
    totalOrders: 12,
    totalSpent: 85600,
    points: 12500,
    lastVisit: '2026-06-01',
    joinDate: '2022-01-10',
    history: [
      { id: 'H1', date: '2026-06-01', activity: 'Frame Purchase (Ray-Ban Aviator)', points: 50, type: 'earned', balance: 12500 },
      { id: 'H2', date: '2026-05-15', activity: 'Lens Replacement (Crizal)', points: 30, type: 'earned', balance: 12450 },
      { id: 'H3', date: '2026-03-14', activity: 'Redeemed ₹100 Voucher', points: 1000, type: 'redeemed', balance: 12420 },
      { id: 'H4', date: '2025-12-22', activity: 'Sunglasses Purchase (Oakley)', points: 40, type: 'earned', balance: 13420 },
      { id: 'H5', date: '2025-09-08', activity: 'Frame Purchase (Titan)', points: 50, type: 'earned', balance: 13380 },
    ],
    timeline: [
      { id: 'TL1', date: '2026-06-01', event: 'Earned 50 Points', desc: 'Purchased Ray-Ban Aviator Frame' },
      { id: 'TL2', date: '2026-05-15', event: 'Earned 30 Points', desc: 'Purchased Crizal lenses' },
      { id: 'TL3', date: '2026-03-14', event: 'Redeemed Reward', desc: 'Used 1,000 points for ₹100 Voucher' },
      { id: 'TL4', date: '2024-05-10', event: 'Moved to Gold Tier', desc: 'Crossed 5,000 loyalty points milestone' },
      { id: 'TL5', date: '2022-01-10', event: 'Joined Loyalty Program', desc: 'Opted in during registration' },
    ],
  },
  {
    id: 2,
    name: 'Priya Sharma',
    phone: '+91 91234 56789',
    totalOrders: 6,
    totalSpent: 34200,
    points: 4500,
    lastVisit: '2026-05-28',
    joinDate: '2023-04-05',
    history: [
      { id: 'H201', date: '2026-05-25', activity: 'Contact Lens Purchase', points: 25, type: 'earned', balance: 4500 },
      { id: 'H202', date: '2026-02-18', activity: 'Frame Purchase (Vogue)', points: 50, type: 'earned', balance: 4475 },
      { id: 'H203', date: '2025-11-10', activity: 'Lens Replacement', points: 30, type: 'earned', balance: 4425 },
    ],
    timeline: [
      { id: 'TL201', date: '2026-05-25', event: 'Earned 25 Points', desc: 'Purchased monthly supply of Alcon Lenses' },
      { id: 'TL202', date: '2026-02-18', event: 'Earned 50 Points', desc: 'Purchased Vogue Half Rim Metal Frame' },
      { id: 'TL203', date: '2023-04-05', event: 'Joined Loyalty Program', desc: 'Opted in during registration' },
    ],
  },
  {
    id: 3,
    name: 'Amit Patel',
    phone: '+91 87654 32109',
    totalOrders: 18,
    totalSpent: 142800,
    points: 18500,
    lastVisit: '2026-05-30',
    joinDate: '2021-06-20',
    history: [
      { id: 'H301', date: '2026-05-28', activity: 'Lens Purchase (Varilux)', points: 30, type: 'earned', balance: 18500 },
      { id: 'H302', date: '2026-04-12', activity: 'Redeemed Premium Membership Gift', points: 5000, type: 'redeemed', balance: 18470 },
      { id: 'H303', date: '2026-01-20', activity: 'Frame Purchase (Carrera)', points: 50, type: 'earned', balance: 23470 },
    ],
    timeline: [
      { id: 'TL301', date: '2026-05-28', event: 'Earned 30 Points', desc: 'Purchased Varilux Progressive lenses' },
      { id: 'TL302', date: '2026-04-12', event: 'Redeemed Reward', desc: 'Used 5,000 points for Premium Membership Gift' },
      { id: 'TL303', date: '2025-10-10', event: 'Moved to Platinum Tier', desc: 'Crossed 15,000 loyalty points milestone' },
      { id: 'TL304', date: '2021-06-20', event: 'Joined Loyalty Program', desc: 'Opted in during registration' },
    ],
  },
  {
    id: 4,
    name: 'Sneha Kapoor',
    phone: '+91 99887 76655',
    totalOrders: 4,
    totalSpent: 22400,
    points: 2800,
    lastVisit: '2026-04-20',
    joinDate: '2024-01-15',
    history: [
      { id: 'H401', date: '2026-04-18', activity: 'Sunglasses Purchase (Ray-Ban)', points: 40, type: 'earned', balance: 2800 },
      { id: 'H402', date: '2025-12-05', activity: 'Frame Purchase (Fastrack)', points: 50, type: 'earned', balance: 2760 },
    ],
    timeline: [
      { id: 'TL401', date: '2026-04-18', event: 'Earned 40 Points', desc: 'Purchased Ray-Ban Wayfarer' },
      { id: 'TL402', date: '2024-01-15', event: 'Joined Loyalty Program', desc: 'Opted in during registration' },
    ],
  },
  {
    id: 5,
    name: 'Divya Nair',
    phone: '+91 88990 11223',
    totalOrders: 8,
    totalSpent: 18900,
    points: 1200,
    lastVisit: '2026-05-22',
    joinDate: '2023-11-05',
    history: [
      { id: 'H501', date: '2026-05-20', activity: 'Contact Lens Purchase', points: 25, type: 'earned', balance: 1200 },
      { id: 'H502', date: '2026-04-25', activity: 'Frame Purchase', points: 50, type: 'earned', balance: 1175 },
    ],
    timeline: [
      { id: 'TL501', date: '2026-05-20', event: 'Earned 25 Points', desc: 'Purchased Alcon Daily Contacts' },
      { id: 'TL502', date: '2023-11-05', event: 'Joined Loyalty Program', desc: 'Opted in during registration' },
    ],
  },
  {
    id: 6,
    name: 'Arjun Malhotra',
    phone: '+91 98100 22334',
    totalOrders: 22,
    totalSpent: 198500,
    points: 25600,
    lastVisit: '2026-06-03',
    joinDate: '2021-03-08',
    history: [
      { id: 'H601', date: '2026-06-02', activity: 'Frame Purchase (Gucci)', points: 50, type: 'earned', balance: 25600 },
      { id: 'H602', date: '2026-05-10', activity: 'Lens Purchase (Zeiss)', points: 30, type: 'earned', balance: 25550 },
      { id: 'H603', date: '2026-03-05', activity: 'Sunglasses Purchase', points: 40, type: 'earned', balance: 25520 },
    ],
    timeline: [
      { id: 'TL601', date: '2026-06-02', event: 'Earned 50 Points', desc: 'Purchased Gucci Frame' },
      { id: 'TL602', date: '2021-03-08', event: 'Joined Loyalty Program', desc: 'Opted in during registration' },
    ],
  },
  {
    id: 7,
    name: 'Sanjay Kulkarni',
    phone: '+91 95678 34521',
    totalOrders: 28,
    totalSpent: 245000,
    points: 32400,
    lastVisit: '2026-06-04',
    joinDate: '2020-11-20',
    history: [
      { id: 'H701', date: '2026-06-03', activity: 'Lens Purchase (Essilor)', points: 30, type: 'earned', balance: 32400 },
      { id: 'H702', date: '2026-05-05', activity: 'Frame Purchase (Ray-Ban)', points: 50, type: 'earned', balance: 32370 },
    ],
    timeline: [
      { id: 'TL701', date: '2026-06-03', event: 'Earned 30 Points', desc: 'Purchased Essilor Varilux Lenses' },
      { id: 'TL702', date: '2020-11-20', event: 'Joined Loyalty Program', desc: 'Opted in during registration' },
    ],
  },
  {
    id: 8,
    name: 'Meera Joshi',
    phone: '+91 97531 86420',
    totalOrders: 3,
    totalSpent: 11200,
    points: 800,
    lastVisit: '2026-05-15',
    joinDate: '2024-03-20',
    history: [
      { id: 'H801', date: '2026-05-12', activity: 'Frame Purchase (Vogue)', points: 50, type: 'earned', balance: 800 },
      { id: 'H802', date: '2026-01-18', activity: 'Lens Purchase', points: 30, type: 'earned', balance: 750 },
    ],
    timeline: [
      { id: 'TL801', date: '2026-05-12', event: 'Earned 50 Points', desc: 'Purchased Vogue frame' },
      { id: 'TL802', date: '2024-03-20', event: 'Joined Loyalty Program', desc: 'Opted in during registration' },
    ],
  }
];

export const getLoyaltyTier = (points) => {
  if (points >= TIERS.PLATINUM.min) return 'Platinum';
  if (points >= TIERS.GOLD.min) return 'Gold';
  return 'Silver';
};

// Storage Helpers
export const getLoyaltyData = () => {
  const customers = localStorage.getItem('loyalty_customers');
  const config = localStorage.getItem('loyalty_points_config');

  if (!customers) {
    localStorage.setItem('loyalty_customers', JSON.stringify(DEFAULT_CUSTOMERS));
  }
  if (!config) {
    localStorage.setItem('loyalty_points_config', JSON.stringify(DEFAULT_POINTS_CONFIG));
  }

  return {
    customers: customers ? JSON.parse(customers) : DEFAULT_CUSTOMERS,
    pointsConfig: config ? JSON.parse(config) : DEFAULT_POINTS_CONFIG,
  };
};

export const saveLoyaltyData = (customers, config) => {
  if (customers) {
    localStorage.setItem('loyalty_customers', JSON.stringify(customers));
  }
  if (config) {
    localStorage.setItem('loyalty_points_config', JSON.stringify(config));
  }
};

export const redeemCustomerReward = (customerId, rewardId) => {
  const { customers } = getLoyaltyData();
  const reward = REWARDS.find(r => r.id === rewardId);
  if (!reward) throw new Error('Reward not found');

  const customerIndex = customers.findIndex(c => c.id === Number(customerId));
  if (customerIndex === -1) throw new Error('Customer not found');

  const customer = customers[customerIndex];
  if (customer.points < reward.points) {
    throw new Error(`Insufficient points. Customer has ${customer.points} points, but needs ${reward.points}.`);
  }

  // Deduct points
  customer.points -= reward.points;
  const today = new Date().toISOString().split('T')[0];

  // Add history
  customer.history.unshift({
    id: `H_RED_${Date.now()}`,
    date: today,
    activity: `Redeemed ${reward.label}`,
    points: reward.points,
    type: 'redeemed',
    balance: customer.points
  });

  // Add timeline
  customer.timeline.unshift({
    id: `TL_RED_${Date.now()}`,
    date: today,
    event: 'Redeemed Reward',
    desc: `Used ${reward.points} points for ${reward.label}`
  });

  customers[customerIndex] = customer;
  saveLoyaltyData(customers, null);
  return customer;
};

export const updatePointsConfig = (newConfig) => {
  saveLoyaltyData(null, newConfig);
  return newConfig;
};
