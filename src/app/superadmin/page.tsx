'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Business, User, UserRole } from '@/types';
import { db } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  collection,
  onSnapshot,
  updateDoc,
  doc
} from 'firebase/firestore';
import { logoutUser } from '@/lib/auth';
import {
  FiPlus,
  FiEdit2,
  FiCheck,
  FiX,
  FiLogOut,
  FiHome,
  FiUsers,
  FiShield,
  FiTrash2,
  FiArrowLeft
} from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

const ROLE_LABELS: Record<Exclude<UserRole, 'superadmin'>, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-purple-100 text-purple-700' },
  waiter: { label: 'Garson', color: 'bg-green-100 text-green-700' },
  bar: { label: 'Bar', color: 'bg-blue-100 text-blue-700' },
  kitchen: { label: 'Mutfak', color: 'bg-orange-100 text-orange-700' }
};

interface BusinessFormData {
  name: string;
  slug: string;
  address: string;
  phone: string;
  tableCount: number;
  isActive: boolean;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
}

interface UserFormData {
  name: string;
  email: string;
  password: string;
  roles: UserRole[];
  isActive: boolean;
}

const initialFormData: BusinessFormData = {
  name: '',
  slug: '',
  address: '',
  phone: '',
  tableCount: 20,
  isActive: true,
  adminEmail: '',
  adminPassword: '',
  adminName: ''
};

const initialUserFormData: UserFormData = {
  name: '',
  email: '',
  password: '',
  roles: [],
  isActive: true
};

export default function SuperAdminPage() {
  const router = useRouter();
  const { user, logout } = useStore();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<string | null>(null);
  const [formData, setFormData] = useState<BusinessFormData>(initialFormData);
  const [loading, setLoading] = useState(false);

  // Isletme detay state'leri
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [businessUsers, setBusinessUsers] = useState<User[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [userFormData, setUserFormData] = useState<UserFormData>(initialUserFormData);
  const [userLoading, setUserLoading] = useState(false);

  // Yetki kontrolu
  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!user.roles.includes('superadmin')) {
      toast.error('Bu sayfaya erisim yetkiniz yok');
      router.replace('/login');
    }
  }, [user, router]);

  // Isletmeleri dinle
  useEffect(() => {
    const businessesRef = collection(db, 'businesses');
    const unsubscribe = onSnapshot(businessesRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Business[];
      setBusinesses(data);
    }, (error) => {
      console.error('Firestore error:', error);
      toast.error('Veri yuklenemedi');
    });

    return () => unsubscribe();
  }, []);

  // Secili isletmenin kullanicilarini dinle
  useEffect(() => {
    if (!selectedBusiness) {
      setBusinessUsers([]);
      return;
    }

    const usersRef = collection(db, 'businesses', selectedBusiness.id, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as User[];
      setBusinessUsers(data);
    }, (error) => {
      console.error('Firestore error:', error);
      toast.error('Kullanicilar yuklenemedi');
    });

    return () => unsubscribe();
  }, [selectedBusiness]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/ş/g, 's')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/ı/g, 'i')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingBusiness) {
        await updateDoc(doc(db, 'businesses', editingBusiness), {
          name: formData.name,
          slug: formData.slug,
          address: formData.address,
          phone: formData.phone,
          tableCount: formData.tableCount,
          isActive: formData.isActive
        });
        toast.success('Isletme guncellendi');
      } else {
        const functions = getFunctions();
        const createBusinessWithAdmin = httpsCallable(functions, 'createBusinessWithAdmin');

        await createBusinessWithAdmin({
          businessName: formData.name,
          businessSlug: formData.slug,
          businessAddress: formData.address,
          businessPhone: formData.phone,
          tableCount: formData.tableCount,
          adminEmail: formData.adminEmail,
          adminPassword: formData.adminPassword,
          adminName: formData.adminName
        });

        toast.success('Isletme ve admin kullanici olusturuldu');
      }

      setShowModal(false);
      setEditingBusiness(null);
      setFormData(initialFormData);
    } catch (error: unknown) {
      console.error('Error:', error);
      const firebaseError = error as { message?: string };
      toast.error(firebaseError.message || 'Islem basarisiz');
    }

    setLoading(false);
  };

  const handleEdit = (business: Business) => {
    setEditingBusiness(business.id);
    setFormData({
      name: business.name,
      slug: business.slug,
      address: business.address || '',
      phone: business.phone || '',
      tableCount: business.tableCount,
      isActive: business.isActive,
      adminEmail: '',
      adminPassword: '',
      adminName: ''
    });
    setShowModal(true);
  };

  const handleToggleActive = async (businessId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'businesses', businessId), {
        isActive: !currentStatus
      });
      toast.success(currentStatus ? 'Isletme pasif yapildi' : 'Isletme aktif yapildi');
    } catch (error) {
      toast.error('Guncelleme basarisiz');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      logout();
      router.push('/login');
    }
  };

  // Kullanici islemleri
  const handleRoleToggle = (role: UserRole) => {
    if (role === 'superadmin') return;
    setUserFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness) return;

    if (userFormData.roles.length === 0) {
      toast.error('En az bir rol secmelisiniz');
      return;
    }
    if (!userFormData.password && !editingUser) {
      toast.error('Sifre gerekli');
      return;
    }
    if (userFormData.password && userFormData.password.length < 6) {
      toast.error('Sifre en az 6 karakter olmali');
      return;
    }

    setUserLoading(true);

    try {
      const functions = getFunctions();

      if (editingUser) {
        await updateDoc(doc(db, 'businesses', selectedBusiness.id, 'users', editingUser), {
          name: userFormData.name,
          roles: userFormData.roles,
          isActive: userFormData.isActive
        });

        if (userFormData.password) {
          const updateUserPassword = httpsCallable(functions, 'updateUserPassword');
          await updateUserPassword({
            userId: editingUser,
            businessId: selectedBusiness.id,
            newPassword: userFormData.password
          });
        }

        toast.success('Kullanici guncellendi');
      } else {
        const createUser = httpsCallable(functions, 'createUser');
        await createUser({
          email: userFormData.email,
          password: userFormData.password,
          name: userFormData.name,
          roles: userFormData.roles,
          businessId: selectedBusiness.id,
          isActive: userFormData.isActive
        });

        toast.success('Kullanici olusturuldu');
      }

      setShowUserModal(false);
      setEditingUser(null);
      setUserFormData(initialUserFormData);
    } catch (error: unknown) {
      console.error('Error:', error);
      const firebaseError = error as { message?: string };
      toast.error(firebaseError.message || 'Islem basarisiz');
    }

    setUserLoading(false);
  };

  const handleEditUser = (userData: User) => {
    setEditingUser(userData.id);
    setUserFormData({
      name: userData.name,
      email: userData.email,
      password: '',
      roles: userData.roles.filter(r => r !== 'superadmin') as UserRole[],
      isActive: userData.isActive
    });
    setShowUserModal(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!selectedBusiness) return;

    if (!confirm('Bu kullaniciyi silmek istediginize emin misiniz?')) {
      return;
    }

    try {
      const functions = getFunctions();
      const deleteUser = httpsCallable(functions, 'deleteUser');
      await deleteUser({
        userId,
        businessId: selectedBusiness.id
      });
      toast.success('Kullanici silindi');
    } catch (error: unknown) {
      console.error('Error:', error);
      const firebaseError = error as { message?: string };
      toast.error(firebaseError.message || 'Silme basarisiz');
    }
  };

  const handleToggleUserActive = async (userId: string, currentStatus: boolean) => {
    if (!selectedBusiness) return;

    try {
      await updateDoc(doc(db, 'businesses', selectedBusiness.id, 'users', userId), {
        isActive: !currentStatus
      });
      toast.success(currentStatus ? 'Kullanici pasif yapildi' : 'Kullanici aktif yapildi');
    } catch (error) {
      toast.error('Guncelleme basarisiz');
    }
  };

  if (!user || !user.roles.includes('superadmin')) {
    return null;
  }

  // Isletme detay gorunumu
  if (selectedBusiness) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Toaster position="top-center" />

        {/* Header */}
        <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedBusiness(null)}
                className="p-2 hover:bg-white/20 rounded-lg transition"
              >
                <FiArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-xl font-bold">{selectedBusiness.name}</h1>
                <p className="text-sm opacity-80">Kullanici Yonetimi</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <FiLogOut size={24} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FiUsers className="text-purple-600" size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{businessUsers.length}</p>
                  <p className="text-sm text-gray-500">Kullanici</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FiCheck className="text-green-600" size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{businessUsers.filter(u => u.isActive).length}</p>
                  <p className="text-sm text-gray-500">Aktif</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FiHome className="text-blue-600" size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{selectedBusiness.tableCount}</p>
                  <p className="text-sm text-gray-500">Masa</p>
                </div>
              </div>
            </div>
          </div>

          {/* Add User Button */}
          <div className="mb-4">
            <button
              onClick={() => {
                setEditingUser(null);
                setUserFormData(initialUserFormData);
                setShowUserModal(true);
              }}
              className="w-full py-3 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-600 transition flex items-center justify-center gap-2"
            >
              <FiPlus size={20} />
              Yeni Kullanici Ekle
            </button>
          </div>

          {/* Users List */}
          <div className="space-y-3">
            {businessUsers.map(userData => (
              <div
                key={userData.id}
                className={`bg-white rounded-xl p-4 shadow ${!userData.isActive ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-800">{userData.name}</h3>
                      {!userData.isActive && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Pasif</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{userData.email}</p>
                    <div className="flex flex-wrap gap-1">
                      {userData.roles.filter(r => r !== 'superadmin').map(role => (
                        <span
                          key={role}
                          className={`text-xs px-2 py-1 rounded ${ROLE_LABELS[role as keyof typeof ROLE_LABELS]?.color || 'bg-gray-100'}`}
                        >
                          {ROLE_LABELS[role as keyof typeof ROLE_LABELS]?.label || role}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleUserActive(userData.id, userData.isActive)}
                      className={`p-2 rounded-lg ${userData.isActive ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                      title={userData.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                    >
                      {userData.isActive ? <FiX size={18} /> : <FiCheck size={18} />}
                    </button>
                    <button
                      onClick={() => handleEditUser(userData)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                      title="Duzenle"
                    >
                      <FiEdit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(userData.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      title="Sil"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {businessUsers.length === 0 && (
              <div className="text-center py-10 text-gray-500">
                <FiUsers className="mx-auto mb-3" size={48} />
                <p>Henuz kullanici yok</p>
                <p className="text-sm">Yeni kullanici ekleyerek baslayin</p>
              </div>
            )}
          </div>
        </div>

        {/* User Modal */}
        {showUserModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
              <div className="bg-purple-500 p-4 text-white">
                <h2 className="text-xl font-bold">
                  {editingUser ? 'Kullanici Duzenle' : 'Yeni Kullanici'}
                </h2>
              </div>

              <form onSubmit={handleUserSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-posta
                  </label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                    disabled={!!editingUser}
                  />
                  {editingUser && (
                    <p className="text-xs text-gray-500 mt-1">E-posta degistirilemez</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sifre {editingUser && '(bos birakirsaniz degismez)'}
                  </label>
                  <input
                    type="password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    required={!editingUser}
                    minLength={6}
                    placeholder={editingUser ? 'Degistirmek icin yeni sifre girin' : 'En az 6 karakter'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Roller
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[]).map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => handleRoleToggle(role)}
                        className={`px-4 py-2 rounded-lg font-medium transition ${
                          userFormData.roles.includes(role)
                            ? `${ROLE_LABELS[role].color} ring-2 ring-offset-1`
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {ROLE_LABELS[role].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="userIsActive"
                    checked={userFormData.isActive}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <label htmlFor="userIsActive" className="text-sm text-gray-700">
                    Hesap aktif
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserModal(false);
                      setEditingUser(null);
                      setUserFormData(initialUserFormData);
                    }}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition"
                  >
                    Iptal
                  </button>
                  <button
                    type="submit"
                    disabled={userLoading}
                    className="flex-1 py-3 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-600 transition disabled:opacity-50"
                  >
                    {userLoading ? 'Kaydediliyor...' : (editingUser ? 'Guncelle' : 'Olustur')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Ana liste gorunumu
  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <FiShield size={28} />
            <div>
              <h1 className="text-xl font-bold">Super Admin Panel</h1>
              <p className="text-sm opacity-80">Isletme Yonetimi</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-white/20 rounded-lg transition"
          >
            <FiLogOut size={24} />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FiHome className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold">{businesses.length}</p>
                <p className="text-sm text-gray-500">Toplam Isletme</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FiCheck className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold">{businesses.filter(b => b.isActive).length}</p>
                <p className="text-sm text-gray-500">Aktif</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <FiX className="text-red-600" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold">{businesses.filter(b => !b.isActive).length}</p>
                <p className="text-sm text-gray-500">Pasif</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiUsers className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-gray-500">Toplam Kullanici</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Business Button */}
        <div className="mb-4">
          <button
            onClick={() => {
              setEditingBusiness(null);
              setFormData(initialFormData);
              setShowModal(true);
            }}
            className="w-full py-3 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-600 transition flex items-center justify-center gap-2"
          >
            <FiPlus size={20} />
            Yeni Isletme Ekle
          </button>
        </div>

        {/* Businesses List */}
        <div className="space-y-3">
          {businesses.map(business => (
            <div
              key={business.id}
              className={`bg-white rounded-xl p-4 shadow ${!business.isActive ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => setSelectedBusiness(business)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800 text-lg">{business.name}</h3>
                    {!business.isActive && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Pasif</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{business.slug}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    {business.address && <span>{business.address}</span>}
                    {business.phone && <span>| {business.phone}</span>}
                    <span>| {business.tableCount} Masa</span>
                    {business.subscription && (
                      <span className={`px-2 py-0.5 rounded ${
                        business.subscription.plan === 'premium' ? 'bg-yellow-100 text-yellow-700' :
                        business.subscription.plan === 'basic' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {business.subscription.plan.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-purple-600 mt-2">Kullanicilari gormek icin tiklayin</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBusiness(business);
                    }}
                    className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg"
                    title="Kullanicilar"
                  >
                    <FiUsers size={18} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleActive(business.id, business.isActive);
                    }}
                    className={`p-2 rounded-lg ${business.isActive ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                    title={business.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                  >
                    {business.isActive ? <FiX size={18} /> : <FiCheck size={18} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(business);
                    }}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                    title="Duzenle"
                  >
                    <FiEdit2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {businesses.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              <FiHome className="mx-auto mb-3" size={48} />
              <p>Henuz isletme yok</p>
              <p className="text-sm">Yeni isletme ekleyerek baslayin</p>
            </div>
          )}
        </div>
      </div>

      {/* Business Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-auto">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden my-4">
            <div className="bg-purple-500 p-4 text-white">
              <h2 className="text-xl font-bold">
                {editingBusiness ? 'Isletme Duzenle' : 'Yeni Isletme'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Isletme Adi
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      name: e.target.value,
                      slug: generateSlug(e.target.value)
                    }));
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug (URL)
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 bg-gray-50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Masa Sayisi
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.tableCount}
                    onChange={(e) => setFormData(prev => ({ ...prev, tableCount: parseInt(e.target.value) || 20 }))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adres
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {!editingBusiness && (
                <>
                  <div className="border-t pt-4">
                    <h3 className="font-medium text-gray-800 mb-3">Admin Kullanici</h3>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Admin Adi
                        </label>
                        <input
                          type="text"
                          value={formData.adminName}
                          onChange={(e) => setFormData(prev => ({ ...prev, adminName: e.target.value }))}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Admin E-posta
                        </label>
                        <input
                          type="email"
                          value={formData.adminEmail}
                          onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Admin Sifre (min 6 karakter)
                        </label>
                        <input
                          type="password"
                          value={formData.adminPassword}
                          onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Isletme aktif
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingBusiness(null);
                    setFormData(initialFormData);
                  }}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition"
                >
                  Iptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-600 transition disabled:opacity-50"
                >
                  {loading ? 'Kaydediliyor...' : (editingBusiness ? 'Guncelle' : 'Olustur')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
