'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { FiUser, FiLock, FiLogIn } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

// Demo users - In production, use Firebase Auth
const DEMO_USERS = [
  { id: '1', email: 'garson@restoran.com', password: '1234', name: 'Ahmet', role: 'waiter' as const },
  { id: '2', email: 'bar@restoran.com', password: '1234', name: 'Bar', role: 'bar' as const },
  { id: '3', email: 'mutfak@restoran.com', password: '1234', name: 'Mutfak', role: 'kitchen' as const },
  { id: '4', email: 'admin@restoran.com', password: 'admin', name: 'Admin', role: 'admin' as const },
];

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Demo authentication
    const user = DEMO_USERS.find(
      u => u.email === email && u.password === password
    );

    if (user) {
      setUser(user);
      toast.success(`Hoş geldin, ${user.name}!`);

      // Redirect based on role
      switch (user.role) {
        case 'waiter':
          router.push('/waiter');
          break;
        case 'bar':
          router.push('/bar');
          break;
        case 'kitchen':
          router.push('/kitchen');
          break;
        case 'admin':
          router.push('/waiter'); // Admin can access all
          break;
      }
    } else {
      toast.error('E-posta veya şifre hatalı');
    }

    setLoading(false);
  };

  const handleQuickLogin = (role: string) => {
    const user = DEMO_USERS.find(u => u.role === role);
    if (user) {
      setEmail(user.email);
      setPassword(user.password);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <Toaster position="top-center" />

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white text-center">
          <h1 className="text-3xl font-bold mb-2">Restoran POS</h1>
          <p className="opacity-80">Sipariş Yönetim Sistemi</p>
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
              Şifre
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
                Giriş Yap
              </>
            )}
          </button>
        </form>

        {/* Quick Login */}
        <div className="px-6 pb-6">
          <p className="text-sm text-gray-500 text-center mb-3">Hızlı Giriş (Demo)</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('waiter')}
              className="py-2 px-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition"
            >
              Garson
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('bar')}
              className="py-2 px-3 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition"
            >
              Bar
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('kitchen')}
              className="py-2 px-3 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-200 transition"
            >
              Mutfak
            </button>
          </div>
        </div>

        {/* Demo Info */}
        <div className="bg-gray-50 px-6 py-4 text-xs text-gray-500">
          <p className="font-medium mb-1">Demo Hesaplar:</p>
          <p>garson@restoran.com / 1234</p>
          <p>bar@restoran.com / 1234</p>
          <p>mutfak@restoran.com / 1234</p>
        </div>
      </div>
    </div>
  );
}
