import { create } from 'zustand';

export const useCartStore = create((set) => ({
  cart: [],
  isSelectionMode: false,
  tempCustomerForm: null,

  startSelection: (formState) => set({
    tempCustomerForm: formState,
    isSelectionMode: true,
    cart: [], // Clear cart for the new selection session
  }),

  addToCart: (product, quantity = 1, selectedColor = '', selectedSize = '') => set((state) => {
    const existingIndex = state.cart.findIndex(
      (item) => item.product.id === product.id &&
                item.selectedColor === selectedColor &&
                item.selectedSize === selectedSize
    );

    if (existingIndex > -1) {
      const updatedCart = [...state.cart];
      updatedCart[existingIndex].quantity += quantity;
      return { cart: updatedCart };
    }

    return {
      cart: [...state.cart, { product, quantity, selectedColor, selectedSize }],
    };
  }),

  removeFromCart: (productId, selectedColor = '', selectedSize = '') => set((state) => ({
    cart: state.cart.filter(
      (item) => !(item.product.id === productId &&
                 item.selectedColor === selectedColor &&
                 item.selectedSize === selectedSize)
    ),
  })),

  updateQuantity: (productId, quantity, selectedColor = '', selectedSize = '') => set((state) => ({
    cart: state.cart.map((item) =>
      item.product.id === productId &&
      item.selectedColor === selectedColor &&
      item.selectedSize === selectedSize
        ? { ...item, quantity: Math.max(1, quantity) }
        : item
    ),
  })),

  clearCart: () => set({ cart: [] }),

  completeSelection: () => set({
    isSelectionMode: false,
    // Keep tempCustomerForm intact so the modal can read it on reload.
    // It will be manually cleared when the customer is successfully saved.
  }),

  cancelSelection: () => set({
    cart: [],
    isSelectionMode: false,
    tempCustomerForm: null,
  }),

  clearCustomerForm: () => set({
    tempCustomerForm: null,
    cart: [],
  }),
}));
