import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  
  clearUser: () => {
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));

export const useStoreStore = create((set) => ({
  stores: [],
  selectedStore: null,

  setStores: (stores) => set((state) => {
    const savedStoreId = localStorage.getItem('admin-selected-store-id');
    let selected = state.selectedStore;
    if (!selected && savedStoreId) {
      selected = stores.find((store) => String(store.id) === String(savedStoreId));
    }
    if (!selected) {
      selected = state.selectedStore && stores.some((store) => store.id === state.selectedStore.id)
        ? stores.find((store) => store.id === state.selectedStore.id)
        : stores[0] || null;
    }
    return {
      stores,
      selectedStore: selected,
    };
  }),

  upsertStore: (store) => set((state) => {
    const exists = state.stores.some((item) => item.id === store.id);
    return {
      stores: exists
        ? state.stores.map((item) => item.id === store.id ? store : item)
        : [store, ...state.stores],
    };
  }),

  setSelectedStore: (store) => {
    if (store) {
      localStorage.setItem('admin-selected-store-id', String(store.id));
    } else {
      localStorage.removeItem('admin-selected-store-id');
    }
    set({ selectedStore: store });
  },
}));
