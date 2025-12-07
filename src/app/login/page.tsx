'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { loginWithEmail } from '@/lib/auth';
import { FiUser, FiLock, FiLogIn } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setCurrentBusiness, user } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Zaten giris yapmissa panel secime yonlendir
  useEffect(() => {
    if (user) {
      if (user.roles.includes('superadmin')) {
        router.replace('/superadmin');
      } else {
        router.replace('/select-panel');
      }
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await loginWithEmail(email, password);

      if (!result) {
        toast.error('Giris yapilamadi');
        setLoading(false);
        return;
      }

      const { user: userData, business } = result;

      // Store'a kaydet
      setUser(userData);
      if (business) {
        setCurrentBusiness(business);
      }

      toast.success(`Hos geldin, ${userData.name}!`);

      // Yonlendirme
      if (userData.roles.includes('superadmin')) {
        router.replace('/superadmin');
      } else if (userData.roles.length === 1) {
        switch (userData.roles[0]) {
          case 'waiter':
            router.replace('/waiter');
            break;
          case 'bar':
            router.replace('/bar');
            break;
          case 'kitchen':
            router.replace('/kitchen');
            break;
          case 'admin':
            router.replace('/admin');
            break;
        }
      } else {
        router.replace('/select-panel');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Giris yapilamadi');
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <Toaster position="top-center" />

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white text-center">
          <h1 className="text-3xl font-bold mb-2">Restoran POS</h1>
          <p className="opacity-80">Siparis Yonetim Sistemi</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-posta
            </label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="ornek@restoran.com"
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
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <FiLogIn />
                Giris Yap
              </>
            )}
          </button>
        </form>

        {/* Info */}
        <div className="bg-gray-50 px-6 py-4 text-xs text-gray-500 text-center">
          <p>Hesabiniz yok mu? Yonetici ile iletisime gecin.</p>
        </div>
      </div>
    </div>
  );
}
