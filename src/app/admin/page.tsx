'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { User, UserRole } from '@/types';
import { getBusinessUsers, createUser, updateUser, deleteUser } from '@/lib/firebaseHelpers';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
  FiArrowLeft,
  FiUsers,
  FiLogOut,
  FiSettings
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
  const { user, currentBusiness, logout } = useStore();
  const [users, setUsers] = useState<(User & { password?: string })[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [loading, setLoading] = useState(false);

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

    const unsubscribe = getBusinessUsers(currentBusiness.id, (usersData) => {
      setUsers(usersData);
    });

    return () => unsubscribe();
  }, [currentBusiness]);

  const handleRoleToggle = (role: UserRole) => {
    if (role === 'superadmin') return; // superadmin eklenemez
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

    setLoading(true);

    try {
      if (editingUser) {
        // Guncelleme
        const updateData: Partial<User> & { password?: string } = {
          name: formData.name,
          email: formData.email,
          roles: formData.roles,
          isActive: formData.isActive
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await updateUser(currentBusiness.id, editingUser, updateData);
        toast.success('Kullanici guncellendi');
      } else {
        // Yeni kullanici
        await createUser(currentBusiness.id, {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          roles: formData.roles,
          isActive: formData.isActive,
          createdBy: user?.id
        });
        toast.success('Kullanici olusturuldu');
      }

      setShowModal(false);
      setEditingUser(null);
      setFormData(initialFormData);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Islem basarisiz');
    }

    setLoading(false);
  };

  const handleEdit = (userData: User & { password?: string }) => {
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
      await deleteUser(currentBusiness.id, userId);
      toast.success('Kullanici silindi');
    } catch (error) {
      toast.error('Silme basarisiz');
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    if (!currentBusiness) return;
    if (userId === user?.id) {
      toast.error('Kendi hesabinizi pasif yapamazsiniz');
      return;
    }

    try {
      await updateUser(currentBusiness.id, userId, { isActive: !currentStatus });
      toast.success(currentStatus ? 'Kullanici pasif yapildi' : 'Kullanici aktif yapildi');
    } catch (error) {
      toast.error('Guncelleme basarisiz');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
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
          <div className="bg-white rounded-xl p-4 shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiSettings className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold">{currentBusiness.tableCount}</p>
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

      {/* Modal */}
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
                />
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
    </div>
  );
}
