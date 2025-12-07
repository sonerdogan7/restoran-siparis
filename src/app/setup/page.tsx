'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { createSuperAdmin } from '@/lib/firebaseHelpers';
import { FiShield, FiUser, FiMail, FiLock, FiCheck } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

export default function SetupPage() {
  const router = useRouter();
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Super admin var mi kontrol et
    const checkAdmin = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'systemUsers'));
        setHasAdmin(!snapshot.empty);
      } catch (error) {
        console.error('Error checking admin:', error);
        setHasAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Sifreler eslesmedi');
      return;
    }

    if (password.length < 6) {
      toast.error('Sifre en az 6 karakter olmali');
      return;
    }

    setLoading(true);

    try {
      await createSuperAdmin(email, password, name);
      toast.success('Super Admin olusturuldu!');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Super Admin olusturulamadi');
    }

    setLoading(false);
  };

  // Yukleniyor
  if (hasAdmin === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Admin zaten var
  if (hasAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCheck className="text-green-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Kurulum Tamamlandi</h1>
          <p className="text-gray-600 mb-6">
            Super Admin zaten olusturulmus. Giris sayfasina yonlendiriliyorsunuz.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-3 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-600 transition"
          >
            Giris Sayfasina Git
          </button>
        </div>
      </div>
    );
  }

  // Kurulum formu
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center p-4">
      <Toaster position="top-center" />

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiShield size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-1">Ilk Kurulum</h1>
          <p className="opacity-80">Super Admin hesabi olusturun</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ad Soyad
            </label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Adiniz Soyadiniz"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-posta
            </label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="admin@ornek.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sifre
            </label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="En az 6 karakter"
                required
                minLength={6}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sifre Tekrar
            </label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Sifrenizi tekrar girin"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <FiShield />
                Super Admin Olustur
              </>
            )}
          </button>
        </form>

        {/* Info */}
        <div className="bg-yellow-50 px-6 py-4 text-xs text-yellow-800 border-t">
          <p className="font-medium mb-1">Onemli:</p>
          <p>Bu sayfa sadece ilk kurulumda gorunur. Super Admin hesabi tum isletmeleri yonetebilir.</p>
        </div>
      </div>
    </div>
  );
}
