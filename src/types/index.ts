// ==================== BUSINESS (ISLETME) ====================
export interface Business {
  id: string;
  name: string;
  slug: string; // URL-friendly isim (ornek: "kafe-istanbul")
  address?: string;
  phone?: string;
  logo?: string;
  tableCount: number;
  isActive: boolean;
  createdAt: Date;
  subscription?: {
    plan: 'free' | 'basic' | 'premium';
    expiresAt: Date;
  };
}

// ==================== USER (KULLANICI) ====================
export type UserRole = 'superadmin' | 'admin' | 'waiter' | 'bar' | 'kitchen';

export interface User {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  businessId: string; // Hangi isletmeye ait
  isActive: boolean;
  createdAt: Date;
  createdBy?: string;
}

// Super admin - tum isletmeleri yonetir (businessId: 'system')
// Admin - kendi isletmesini yonetir
// Waiter/Bar/Kitchen - kendi isletmesinde calisir

// ==================== TABLE (MASA) ====================
export interface Table {
  id: string;
  number: number;
  status: 'empty' | 'occupied';
  guestCount: number;
  waiter?: string;
  waiterId?: string;
  openedAt?: Date;
}

// ==================== MENU ====================
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  subCategory: string;
  destination: 'bar' | 'kitchen';
  description?: string;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: 'food' | 'drink';
  order: number;
  subCategories: SubCategory[];
}

export interface SubCategory {
  id: string;
  name: string;
  order: number;
  items: MenuItem[];
}

// ==================== ORDER (SIPARIS) ====================
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
  waiterId: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  total: number;
}

// ==================== FIREBASE PATHS ====================
// businesses/{businessId}/tables/{tableId}
// businesses/{businessId}/orders/{orderId}
// businesses/{businessId}/products/{productId}
// businesses/{businessId}/users/{userId}
// businesses/{businessId}/categories/{categoryId}
