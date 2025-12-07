import { auth, db } from './firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { User, Business } from '@/types';

// Firebase Auth ile giris yap
export const loginWithEmail = async (email: string, password: string): Promise<{
  user: User;
  business: Business | null;
} | null> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Kullanici bilgilerini Firestore'dan al
    const userData = await getUserData(firebaseUser.uid);
    if (!userData) {
      await signOut(auth);
      throw new Error('Kullanici bilgileri bulunamadi');
    }

    if (!userData.isActive) {
      await signOut(auth);
      throw new Error('Hesabiniz pasif durumda');
    }

    // Isletme bilgisini al (superadmin degilse)
    let business: Business | null = null;
    if (!userData.roles.includes('superadmin') && userData.businessId !== 'system') {
      business = await getBusiness(userData.businessId);
      if (!business) {
        await signOut(auth);
        throw new Error('Isletme bulunamadi');
      }
      if (!business.isActive) {
        await signOut(auth);
        throw new Error('Isletme aktif degil');
      }
    }

    return { user: userData, business };
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
      throw new Error('E-posta veya sifre hatali');
    }
    throw error;
  }
};

// Firebase Auth ile kullanici olustur
export const createAuthUser = async (
  email: string,
  password: string,
  userData: Omit<User, 'id' | 'createdAt'>
): Promise<string> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCredential.user.uid;

  // Firestore'a kullanici bilgilerini kaydet
  if (userData.businessId === 'system') {
    // Superadmin - systemUsers collection'a kaydet
    await setDoc(doc(db, 'systemUsers', uid), {
      ...userData,
      createdAt: serverTimestamp()
    });
  } else {
    // Normal kullanici - business altina kaydet
    await setDoc(doc(db, 'businesses', userData.businessId, 'users', uid), {
      ...userData,
      createdAt: serverTimestamp()
    });
  }

  return uid;
};

// Admin tarafindan kullanici olustur (sifresiz - davet sistemi icin)
// Not: Firebase Auth admin SDK gerektirdigineden, simdilik normal auth kullaniyoruz
export const createUserByAdmin = async (
  businessId: string,
  email: string,
  password: string,
  userData: Omit<User, 'id' | 'createdAt' | 'businessId' | 'email'>
): Promise<string> => {
  // Gecici olarak mevcut kullanicinin auth durumunu kaydet
  const currentUser = auth.currentUser;

  try {
    // Yeni kullanici olustur
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Firestore'a kullanici bilgilerini kaydet
    await setDoc(doc(db, 'businesses', businessId, 'users', uid), {
      ...userData,
      email,
      businessId,
      createdAt: serverTimestamp()
    });

    // Yeni olusturulan kullanicidan cikis yap
    await signOut(auth);

    // Eger onceki kullanici varsa tekrar giris yap
    // Not: Bu ideal degil, Firebase Admin SDK ile daha iyi yapilabilir

    return uid;
  } catch (error) {
    throw error;
  }
};

// Cikis yap
export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
};

// Kullanici verilerini getir
export const getUserData = async (uid: string): Promise<User | null> => {
  // Oncelikle systemUsers'da ara (superadmin)
  const systemUserDoc = await getDoc(doc(db, 'systemUsers', uid));
  if (systemUserDoc.exists()) {
    const data = systemUserDoc.data();
    return {
      id: uid,
      email: data.email,
      name: data.name,
      roles: data.roles,
      businessId: data.businessId || 'system',
      isActive: data.isActive,
      createdAt: data.createdAt?.toDate() || new Date()
    };
  }

  // Tum isletmelerde ara
  const businessesSnapshot = await getDocs(collection(db, 'businesses'));
  for (const businessDoc of businessesSnapshot.docs) {
    const userDoc = await getDoc(doc(db, 'businesses', businessDoc.id, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        id: uid,
        email: data.email,
        name: data.name,
        roles: data.roles,
        businessId: businessDoc.id,
        isActive: data.isActive,
        createdAt: data.createdAt?.toDate() || new Date()
      };
    }
  }

  return null;
};

// Isletme bilgisini getir
export const getBusiness = async (businessId: string): Promise<Business | null> => {
  const docRef = await getDoc(doc(db, 'businesses', businessId));
  if (!docRef.exists()) return null;
  return {
    id: docRef.id,
    ...docRef.data(),
    createdAt: docRef.data().createdAt?.toDate() || new Date()
  } as Business;
};

// Auth durumu degisikliklerini dinle
export const onAuthChange = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Mevcut kullaniciyi al
export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};
