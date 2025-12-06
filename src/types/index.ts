export interface Table {
  id: string;
  number: number;
  status: 'empty' | 'occupied';
  guestCount: number;
  waiter?: string;
  openedAt?: Date;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  subCategory: string;
  destination: 'bar' | 'kitchen';
  description?: string;
}

export interface OrderItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
  status: 'pending' | 'preparing' | 'ready' | 'served';
  createdAt: Date;
}

export interface Order {
  id: string;
  tableId: string;
  tableNumber: number;
  items: OrderItem[];
  waiter: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  total: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'waiter' | 'bar' | 'kitchen';
}

export interface Category {
  id: string;
  name: string;
  type: 'food' | 'drink';
  subCategories: SubCategory[];
}

export interface SubCategory {
  id: string;
  name: string;
  items: MenuItem[];
}
