import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { Business, User, Table, Order, Category, MenuItem } from '@/types';

// ==================== BUSINESS HELPERS ====================

// Tum isletmeleri getir (superadmin icin)
export const getBusinesses = async (): Promise<Business[]> => {
  const snapshot = await getDocs(collection(db, 'businesses'));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date()
  })) as Business[];
};

// Tek isletme getir
export const getBusiness = async (businessId: string): Promise<Business | null> => {
  const docRef = await getDoc(doc(db, 'businesses', businessId));
  if (!docRef.exists()) return null;
  return {
    id: docRef.id,
    ...docRef.data(),
    createdAt: docRef.data().createdAt?.toDate() || new Date()
  } as Business;
};

// Isletme olustur
export const createBusiness = async (data: Omit<Business, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'businesses'), {
    ...data,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

// Isletme guncelle
export const updateBusiness = async (businessId: string, data: Partial<Business>): Promise<void> => {
  await updateDoc(doc(db, 'businesses', businessId), data);
};

// ==================== USER HELPERS ====================

// Isletmenin kullanicilari
export const getBusinessUsers = (businessId: string, callback: (users: User[]) => void): Unsubscribe => {
  const usersRef = collection(db, 'businesses', businessId, 'users');
  return onSnapshot(usersRef, (snapshot) => {
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    })) as User[];
    callback(users);
  });
};

// E-posta ile kullanici bul (giris icin)
export const findUserByEmail = async (email: string): Promise<(User & { password: string; businessId: string }) | null> => {
  // Tum isletmelerdeki kullanicilari ara
  const businessesSnapshot = await getDocs(collection(db, 'businesses'));

  for (const businessDoc of businessesSnapshot.docs) {
    const usersRef = collection(db, 'businesses', businessDoc.id, 'users');
    const q = query(usersRef, where('email', '==', email));
    const userSnapshot = await getDocs(q);

    if (!userSnapshot.empty) {
      const userData = userSnapshot.docs[0].data();
      return {
        id: userSnapshot.docs[0].id,
        ...userData,
        businessId: businessDoc.id,
        createdAt: userData.createdAt?.toDate() || new Date()
      } as User & { password: string; businessId: string };
    }
  }

  // System users (superadmin) icin kontrol
  const systemUsersRef = collection(db, 'systemUsers');
  const q = query(systemUsersRef, where('email', '==', email));
  const systemSnapshot = await getDocs(q);

  if (!systemSnapshot.empty) {
    const userData = systemSnapshot.docs[0].data();
    return {
      id: systemSnapshot.docs[0].id,
      ...userData,
      businessId: 'system',
      createdAt: userData.createdAt?.toDate() || new Date()
    } as User & { password: string; businessId: string };
  }

  return null;
};

// Kullanici olustur
export const createUser = async (
  businessId: string,
  data: Omit<User, 'id' | 'createdAt' | 'businessId'> & { password: string }
): Promise<string> => {
  const usersRef = collection(db, 'businesses', businessId, 'users');
  const docRef = await addDoc(usersRef, {
    ...data,
    businessId,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

// Kullanici guncelle
export const updateUser = async (
  businessId: string,
  userId: string,
  data: Partial<User> & { password?: string }
): Promise<void> => {
  await updateDoc(doc(db, 'businesses', businessId, 'users', userId), data);
};

// Kullanici sil
export const deleteUser = async (businessId: string, userId: string): Promise<void> => {
  await deleteDoc(doc(db, 'businesses', businessId, 'users', userId));
};

// ==================== TABLE HELPERS ====================

// Isletmenin masalarini dinle
export const subscribeToTables = (businessId: string, callback: (tables: Table[]) => void): Unsubscribe => {
  const tablesRef = collection(db, 'businesses', businessId, 'tables');
  return onSnapshot(tablesRef, (snapshot) => {
    const tables = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      openedAt: doc.data().openedAt?.toDate()
    })) as Table[];
    callback(tables.sort((a, b) => a.number - b.number));
  });
};

// Masalari ilk kez olustur
export const initializeTables = async (businessId: string, count: number): Promise<void> => {
  const tablesRef = collection(db, 'businesses', businessId, 'tables');

  for (let i = 1; i <= count; i++) {
    await setDoc(doc(tablesRef, `table-${i}`), {
      number: i,
      status: 'empty',
      guestCount: 0
    });
  }
};

// Masa guncelle
export const updateTable = async (
  businessId: string,
  tableId: string,
  data: Partial<Table>
): Promise<void> => {
  await updateDoc(doc(db, 'businesses', businessId, 'tables', tableId), {
    ...data,
    ...(data.openedAt ? { openedAt: serverTimestamp() } : {})
  });
};

// ==================== ORDER HELPERS ====================

// Aktif siparisleri dinle
export const subscribeToOrders = (
  businessId: string,
  status: 'active' | 'completed' | 'all',
  callback: (orders: Order[]) => void
): Unsubscribe => {
  const ordersRef = collection(db, 'businesses', businessId, 'orders');
  const q = status === 'all'
    ? ordersRef
    : query(ordersRef, where('status', '==', status));

  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as Order[];
    callback(orders);
  });
};

// Siparis olustur
export const createOrder = async (businessId: string, data: Omit<Order, 'id'>): Promise<string> => {
  const ordersRef = collection(db, 'businesses', businessId, 'orders');
  const docRef = await addDoc(ordersRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

// Siparis guncelle
export const updateOrder = async (
  businessId: string,
  orderId: string,
  data: Partial<Order>
): Promise<void> => {
  await updateDoc(doc(db, 'businesses', businessId, 'orders', orderId), {
    ...data,
    updatedAt: serverTimestamp()
  });
};

// ==================== MENU/CATEGORY HELPERS ====================

// Kategorileri dinle
export const subscribeToCategories = (
  businessId: string,
  callback: (categories: Category[]) => void
): Unsubscribe => {
  const categoriesRef = collection(db, 'businesses', businessId, 'categories');
  return onSnapshot(categoriesRef, (snapshot) => {
    const categories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Category[];
    callback(categories.sort((a, b) => (a.order || 0) - (b.order || 0)));
  });
};

// Kategori olustur
export const createCategory = async (
  businessId: string,
  data: Omit<Category, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, 'businesses', businessId, 'categories'), data);
  return docRef.id;
};

// Urunleri dinle
export const subscribeToProducts = (
  businessId: string,
  callback: (products: MenuItem[]) => void
): Unsubscribe => {
  const productsRef = collection(db, 'businesses', businessId, 'products');
  return onSnapshot(productsRef, (snapshot) => {
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MenuItem[];
    callback(products);
  });
};

// Urun olustur
export const createProduct = async (
  businessId: string,
  data: Omit<MenuItem, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, 'businesses', businessId, 'products'), {
    ...data,
    isActive: true
  });
  return docRef.id;
};

// Urun guncelle
export const updateProduct = async (
  businessId: string,
  productId: string,
  data: Partial<MenuItem>
): Promise<void> => {
  await updateDoc(doc(db, 'businesses', businessId, 'products', productId), data);
};

// ==================== INITIALIZATION ====================

// Yeni isletme icin ornek veri olustur
export const initializeBusinessData = async (businessId: string, tableCount: number = 20): Promise<void> => {
  // Masalari olustur
  await initializeTables(businessId, tableCount);

  // Ornek kategoriler
  const sampleCategories = [
    {
      name: 'Icecekler',
      type: 'drink',
      order: 1,
      subCategories: [
        { id: 'sicak-icecekler', name: 'Sicak Icecekler', order: 1, items: [] },
        { id: 'soguk-icecekler', name: 'Soguk Icecekler', order: 2, items: [] },
        { id: 'alkollu', name: 'Alkollu Icecekler', order: 3, items: [] }
      ]
    },
    {
      name: 'Yiyecekler',
      type: 'food',
      order: 2,
      subCategories: [
        { id: 'baslangiclar', name: 'Baslangiclar', order: 1, items: [] },
        { id: 'ana-yemekler', name: 'Ana Yemekler', order: 2, items: [] },
        { id: 'tatlilar', name: 'Tatlilar', order: 3, items: [] }
      ]
    }
  ];

  for (const cat of sampleCategories) {
    await createCategory(businessId, cat as Omit<Category, 'id'>);
  }
};

// Super admin olustur (ilk kurulum)
export const createSuperAdmin = async (
  email: string,
  password: string,
  name: string
): Promise<string> => {
  const docRef = await addDoc(collection(db, 'systemUsers'), {
    email,
    password,
    name,
    roles: ['superadmin'],
    businessId: 'system',
    isActive: true,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};
