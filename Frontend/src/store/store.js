import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  
  clearUser: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));

export const useStoreStore = create((set) => ({
  stores: [
    { id: 1, name: 'Main St Optical', code: 'MSO-001', gst: '', phone: '9876543210', email: '', address: '123 Main St', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', status: 'Active' },
    { id: 2, name: 'Downtown Eyewear', code: 'DTE-002', gst: '', phone: '9876543211', email: '', address: '456 Downtown Rd', city: 'Delhi', state: 'Delhi', pincode: '110001', status: 'Active' },
    { id: 3, name: 'Westside Clinic', code: 'WSC-003', gst: '', phone: '9876543212', email: '', address: '789 West Ave', city: 'Pune', state: 'Maharashtra', pincode: '411001', status: 'Active' },
  ],
  selectedStore: null,

  addStore: (store) => set((state) => ({
    stores: [...state.stores, { ...store, id: Date.now() }],
  })),

  setSelectedStore: (store) => set({ selectedStore: store }),
}));
