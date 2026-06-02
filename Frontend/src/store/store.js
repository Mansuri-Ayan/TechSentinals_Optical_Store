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

  setStores: (stores) => set((state) => ({
    stores,
    selectedStore: state.selectedStore && stores.some((store) => store.id === state.selectedStore.id)
      ? stores.find((store) => store.id === state.selectedStore.id)
      : stores[0] || null,
  })),

  upsertStore: (store) => set((state) => {
    const exists = state.stores.some((item) => item.id === store.id);
    return {
      stores: exists
        ? state.stores.map((item) => item.id === store.id ? store : item)
        : [store, ...state.stores],
    };
  }),

  setSelectedStore: (store) => set({ selectedStore: store }),
}));
