'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Business } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { createUser, initializeBusinessData } from '@/lib/firebaseHelpers';
import {
  FiPlus,
  FiEdit2,
  FiCheck,
  FiX,
  FiLogOut,
  FiHome,
  FiUsers,
  FiShield
} from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

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

export default function SuperAdminPage() {
  const router = useRouter();
  const { user, logout } = useStore();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<string | null>(null);
  const [formData, setFormData] = useState<BusinessFormData>(initialFormData);
  const [loading, setLoading] = useState(false);

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
    });

    return () => unsubscribe();
  }, []);

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
        // Isletme guncelle
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
        // Yeni isletme olustur
        const businessRef = await addDoc(collection(db, 'businesses'), {
          name: formData.name,
          slug: formData.slug,
          address: formData.address,
          phone: formData.phone,
          tableCount: formData.tableCount,
          isActive: formData.isActive,
          createdAt: serverTimestamp(),
          subscription: {
            plan: 'free',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 gun
          }
        });

        // Admin kullanici olustur
        await createUser(businessRef.id, {
          email: formData.adminEmail,
          password: formData.adminPassword,
          name: formData.adminName,
          roles: ['admin'],
          isActive: true
        });

        // Masalari ve ornek verileri olustur
        await initializeBusinessData(businessRef.id, formData.tableCount);

        toast.success('Isletme ve admin kullanici olusturuldu');
      }

      setShowModal(false);
      setEditingBusiness(null);
      setFormData(initialFormData);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Islem basarisiz');
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

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user || !user.roles.includes('superadmin')) {
    return null;
  }

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
                <div className="flex-1">
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
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(business.id, business.isActive)}
                    className={`p-2 rounded-lg ${business.isActive ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                    title={business.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                  >
                    {business.isActive ? <FiX size={18} /> : <FiCheck size={18} />}
                  </button>
                  <button
                    onClick={() => handleEdit(business)}
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

      {/* Modal */}
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
                          Admin Sifre
                        </label>
                        <input
                          type="password"
                          value={formData.adminPassword}
                          onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                          required
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
