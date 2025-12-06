import { create } from 'zustand';
import { Table, Order, OrderItem, MenuItem, User } from '@/types';

interface AppState {
  // User
  user: User | null;
  setUser: (user: User | null) => void;

  // Tables
  tables: Table[];
  setTables: (tables: Table[]) => void;
  updateTable: (tableId: string, data: Partial<Table>) => void;

  // Current table for waiter
  currentTable: Table | null;
  setCurrentTable: (table: Table | null) => void;

  // Active orders for waiter
  activeOrders: Order[];
  setActiveOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrder: (orderId: string, data: Partial<Order>) => void;

  // Cart per table (masa bazli sepet)
  tableCarts: Record<string, OrderItem[]>;
  cartItems: OrderItem[];
  addToCart: (item: MenuItem, quantity?: number, notes?: string) => void;
  removeFromCart: (itemId: string) => void;
  updateCartItem: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  loadCartForTable: (tableId: string) => void;
  saveCartForTable: (tableId: string) => void;

  // UI State
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  selectedSubCategory: string | null;
  setSelectedSubCategory: (subCategory: string | null) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // User
  user: null,
  setUser: (user) => set({ user }),

  // Tables
  tables: [],
  setTables: (tables) => set({ tables }),
  updateTable: (tableId, data) =>
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === tableId ? { ...t, ...data } : t
      ),
    })),

  // Current table
  currentTable: null,
  setCurrentTable: (table) => {
    const state = get();
    // Mevcut masanin sepetini kaydet
    if (state.currentTable && state.cartItems.length > 0) {
      set((s) => ({
        tableCarts: {
          ...s.tableCarts,
          [state.currentTable!.id]: s.cartItems
        }
      }));
    }
    // Yeni masanin sepetini yukle
    if (table) {
      const savedCart = state.tableCarts[table.id] || [];
      set({ currentTable: table, cartItems: savedCart });
    } else {
      set({ currentTable: table });
    }
  },

  // Active orders
  activeOrders: [],
  setActiveOrders: (orders) => set({ activeOrders: orders }),
  addOrder: (order) =>
    set((state) => ({ activeOrders: [...state.activeOrders, order] })),
  updateOrder: (orderId, data) =>
    set((state) => ({
      activeOrders: state.activeOrders.map((o) =>
        o.id === orderId ? { ...o, ...data } : o
      ),
    })),

  // Cart
  tableCarts: {},
  cartItems: [],
  addToCart: (item, quantity = 1, notes) => {
    const existingIndex = get().cartItems.findIndex(
      (ci) => ci.menuItem.id === item.id && ci.notes === notes
    );

    if (existingIndex > -1) {
      set((state) => ({
        cartItems: state.cartItems.map((ci, i) =>
          i === existingIndex
            ? { ...ci, quantity: ci.quantity + quantity }
            : ci
        ),
      }));
    } else {
      const newItem: OrderItem = {
        id: `${item.id}-${Date.now()}`,
        menuItem: item,
        quantity,
        notes,
        status: 'pending',
        createdAt: new Date(),
      };
      set((state) => ({ cartItems: [...state.cartItems, newItem] }));
    }

    // Otomatik olarak masa sepetini guncelle
    const currentTable = get().currentTable;
    if (currentTable) {
      set((state) => ({
        tableCarts: {
          ...state.tableCarts,
          [currentTable.id]: state.cartItems
        }
      }));
    }
  },
  removeFromCart: (itemId) => {
    set((state) => ({
      cartItems: state.cartItems.filter((ci) => ci.id !== itemId),
    }));
    // Masa sepetini guncelle
    const currentTable = get().currentTable;
    if (currentTable) {
      set((state) => ({
        tableCarts: {
          ...state.tableCarts,
          [currentTable.id]: state.cartItems
        }
      }));
    }
  },
  updateCartItem: (itemId, quantity) => {
    set((state) => ({
      cartItems: state.cartItems.map((ci) =>
        ci.id === itemId ? { ...ci, quantity } : ci
      ),
    }));
    // Masa sepetini guncelle
    const currentTable = get().currentTable;
    if (currentTable) {
      set((state) => ({
        tableCarts: {
          ...state.tableCarts,
          [currentTable.id]: state.cartItems
        }
      }));
    }
  },
  clearCart: () => {
    const currentTable = get().currentTable;
    if (currentTable) {
      // Masa sepetini de temizle
      set((state) => ({
        cartItems: [],
        tableCarts: {
          ...state.tableCarts,
          [currentTable.id]: []
        }
      }));
    } else {
      set({ cartItems: [] });
    }
  },
  loadCartForTable: (tableId) => {
    const savedCart = get().tableCarts[tableId] || [];
    set({ cartItems: savedCart });
  },
  saveCartForTable: (tableId) => {
    set((state) => ({
      tableCarts: {
        ...state.tableCarts,
        [tableId]: state.cartItems
      }
    }));
  },

  // UI State
  selectedCategory: null,
  setSelectedCategory: (category) => set({ selectedCategory: category, selectedSubCategory: null }),
  selectedSubCategory: null,
  setSelectedSubCategory: (subCategory) => set({ selectedSubCategory: subCategory }),
}));
