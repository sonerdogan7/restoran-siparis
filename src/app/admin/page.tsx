'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { User, UserRole } from '@/types';
import { db } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  collection,
  onSnapshot,
  updateDoc,
  doc
} from 'firebase/firestore';
import { logoutUser } from '@/lib/auth';
import { updateTableCount } from '@/lib/firebaseHelpers';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
  FiArrowLeft,
  FiUsers,
  FiLogOut,
  FiSettings,
  FiBook
} from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

const ROLE_LABELS: Record<Exclude<UserRole, 'superadmin'>, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-purple-100 text-purple-700' },
  waiter: { label: 'Garson', color: 'bg-green-100 text-green-700' },
  bar: { label: 'Bar', color: 'bg-blue-100 text-blue-700' },
  kitchen: { label: 'Mutfak', color: 'bg-orange-100 text-orange-700' }
};

interface UserFormData {
  name: string;
  email: string;
  password: string;
  roles: UserRole[];
  isActive: boolean;
}

const initialFormData: UserFormData = {
  name: '',
  email: '',
  password: '',
  roles: [],
  isActive: true
};

export default function AdminPage() {
  const router = useRouter();
  const { user, currentBusiness, setCurrentBusiness, logout } = useStore();
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [showTableSettings, setShowTableSettings] = useState(false);
  const [newTableCount, setNewTableCount] = useState(currentBusiness?.tableCount || 20);
  const [tableLoading, setTableLoading] = useState(false);

  // Yetki kontrolu
  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!user.roles.includes('admin')) {
      toast.error('Bu sayfaya erisim yetkiniz yok');
      router.replace('/select-panel');
      return;
    }
    if (!currentBusiness) {
      toast.error('Isletme bilgisi bulunamadi');
      router.replace('/login');
      return;
    }
  }, [user, currentBusiness, router]);

  // Kullanicilari dinle
  useEffect(() => {
    if (!currentBusiness) return;

    const usersRef = collection(db, 'businesses', currentBusiness.id, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as User[];
      setUsers(usersData);
    }, (error) => {
      console.error('Firestore error:', error);
      toast.error('Kullanicilar yuklenemedi');
    });

    return () => unsubscribe();
  }, [currentBusiness]);

  const handleRoleToggle = (role: UserRole) => {
    if (role === 'superadmin') return;
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;

    if (formData.roles.length === 0) {
      toast.error('En az bir rol secmelisiniz');
      return;
    }
    if (!formData.password && !editingUser) {
      toast.error('Sifre gerekli');
      return;
    }
    if (formData.password && formData.password.length < 6) {
      toast.error('Sifre en az 6 karakter olmali');
      return;
    }

    setLoading(true);

    try {
      const functions = getFunctions();

      if (editingUser) {
        // Guncelleme - Firestore'da bilgileri guncelle
        await updateDoc(doc(db, 'businesses', currentBusiness.id, 'users', editingUser), {
          name: formData.name,
          email: formData.email,
          roles: formData.roles,
          isActive: formData.isActive
        });

        // Sifre degistirilecekse Cloud Function kullan
        if (formData.password) {
          const updateUserPassword = httpsCallable(functions, 'updateUserPassword');
          await updateUserPassword({
            userId: editingUser,
            businessId: currentBusiness.id,
            newPassword: formData.password
          });
        }

        toast.success('Kullanici guncellendi');
      } else {
        // Yeni kullanici - Cloud Function kullan
        const createUser = httpsCallable(functions, 'createUser');
        await createUser({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          roles: formData.roles,
          businessId: currentBusiness.id,
          isActive: formData.isActive
        });

        toast.success('Kullanici olusturuldu');
      }

      setShowModal(false);
      setEditingUser(null);
      setFormData(initialFormData);
    } catch (error: unknown) {
      console.error('Error:', error);
      const firebaseError = error as { message?: string };
      toast.error(firebaseError.message || 'Islem basarisiz');
    }

    setLoading(false);
  };

  const handleEdit = (userData: User) => {
    setEditingUser(userData.id);
    setFormData({
      name: userData.name,
      email: userData.email,
      password: '',
      roles: userData.roles.filter(r => r !== 'superadmin') as UserRole[],
      isActive: userData.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (userId: string) => {
    if (!currentBusiness) return;
    if (userId === user?.id) {
      toast.error('Kendinizi silemezsiniz');
      return;
    }

    if (!confirm('Bu kullaniciyi silmek istediginize emin misiniz?')) {
      return;
    }

    try {
      const functions = getFunctions();
      const deleteUser = httpsCallable(functions, 'deleteUser');
      await deleteUser({
        userId,
        businessId: currentBusiness.id
      });
      toast.success('Kullanici silindi');
    } catch (error: unknown) {
      console.error('Error:', error);
      const firebaseError = error as { message?: string };
      toast.error(firebaseError.message || 'Silme basarisiz');
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    if (!currentBusiness) return;
    if (userId === user?.id) {
      toast.error('Kendi hesabinizi pasif yapamazsiniz');
      return;
    }

    try {
      await updateDoc(doc(db, 'businesses', currentBusiness.id, 'users', userId), {
        isActive: !currentStatus
      });
      toast.success(currentStatus ? 'Kullanici pasif yapildi' : 'Kullanici aktif yapildi');
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

  const handleTableCountUpdate = async () => {
    if (!currentBusiness) return;
    if (newTableCount === currentBusiness.tableCount) {
      setShowTableSettings(false);
      return;
    }
    if (newTableCount < 1 || newTableCount > 100) {
      toast.error('Masa sayisi 1-100 arasinda olmali');
      return;
    }

    setTableLoading(true);
    try {
      await updateTableCount(currentBusiness.id, currentBusiness.tableCount, newTableCount);
      setCurrentBusiness({ ...currentBusiness, tableCount: newTableCount });
      toast.success('Masa sayisi guncellendi');
      setShowTableSettings(false);
    } catch (error) {
      console.error('Error updating table count:', error);
      toast.error('Masa sayisi guncellenemedi');
    }
    setTableLoading(false);
  };

  if (!user || !user.roles.includes('admin') || !currentBusiness) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push('/select-panel')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <FiArrowLeft size={24} />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-gray-800">Yonetim Paneli</h1>
            <p className="text-xs text-gray-500">{currentBusiness.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-gray-100 rounded-lg text-red-500"
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
                <FiUsers className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-gray-500">Toplam Kullanici</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FiCheck className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.filter(u => u.isActive).length}</p>
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
                <p className="text-2xl font-bold">{users.filter(u => !u.isActive).length}</p>
                <p className="text-sm text-gray-500">Pasif</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setNewTableCount(currentBusiness.tableCount);
              setShowTableSettings(true);
            }}
            className="bg-white rounded-xl p-4 shadow hover:shadow-md transition cursor-pointer text-left w-full"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiSettings className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold">{currentBusiness.tableCount}</p>
                <p className="text-sm text-gray-500">Masa (Duzenle)</p>
              </div>
            </div>
          </button>
        </div>

        {/* Menu Yonetimi Button */}
        <div className="mb-4">
          <button
            onClick={() => router.push('/admin/menu')}
            className="w-full py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition flex items-center justify-center gap-2"
          >
            <FiBook size={20} />
            Menu Yonetimi
          </button>
        </div>

        {/* Add User Button */}
        <div className="mb-4">
          <button
            onClick={() => {
              setEditingUser(null);
              setFormData(initialFormData);
              setShowModal(true);
            }}
            className="w-full py-3 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-600 transition flex items-center justify-center gap-2"
          >
            <FiPlus size={20} />
            Yeni Kullanici Ekle
          </button>
        </div>

        {/* Users List */}
        <div className="space-y-3">
          {users.map(userData => (
            <div
              key={userData.id}
              className={`bg-white rounded-xl p-4 shadow ${!userData.isActive ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800">{userData.name}</h3>
                    {userData.id === user.id && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Sen</span>
                    )}
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
                    onClick={() => handleToggleActive(userData.id, userData.isActive)}
                    className={`p-2 rounded-lg ${userData.isActive ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                    title={userData.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                  >
                    {userData.isActive ? <FiX size={18} /> : <FiCheck size={18} />}
                  </button>
                  <button
                    onClick={() => handleEdit(userData)}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                    title="Duzenle"
                  >
                    <FiEdit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(userData.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    title="Sil"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="bg-purple-500 p-4 text-white">
              <h2 className="text-xl font-bold">
                {editingUser ? 'Kullanici Duzenle' : 'Yeni Kullanici'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ad Soyad
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
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
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
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
                        formData.roles.includes(role)
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
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Hesap aktif
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingUser(null);
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
                  {loading ? 'Kaydediliyor...' : (editingUser ? 'Guncelle' : 'Olustur')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table Settings Modal */}
      {showTableSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-blue-500 p-4 text-white">
              <h2 className="text-xl font-bold">Masa Sayisi Ayarla</h2>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Masa Sayisi
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newTableCount}
                  onChange={(e) => setNewTableCount(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-2xl font-bold"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Mevcut: {currentBusiness.tableCount} masa
                </p>
                {newTableCount < currentBusiness.tableCount && (
                  <p className="text-xs text-orange-600 mt-1">
                    Not: Dolu masalar silinmez, sadece bos masalar kaldirilir.
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowTableSettings(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition"
                >
                  Iptal
                </button>
                <button
                  onClick={handleTableCountUpdate}
                  disabled={tableLoading}
                  className="flex-1 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition disabled:opacity-50"
                >
                  {tableLoading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
