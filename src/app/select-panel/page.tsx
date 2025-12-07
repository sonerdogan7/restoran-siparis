'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { UserRole } from '@/types';
import { FiUsers, FiCoffee, FiGrid, FiSettings, FiLogOut } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

const PANEL_INFO: Record<Exclude<UserRole, 'superadmin'>, { name: string; icon: React.ReactNode; color: string; path: string; description: string }> = {
  waiter: {
    name: 'Garson Paneli',
    icon: <FiUsers size={32} />,
    color: 'from-green-500 to-green-600',
    path: '/waiter',
    description: 'Masa yonetimi ve siparis alma'
  },
  bar: {
    name: 'Bar Paneli',
    icon: <FiCoffee size={32} />,
    color: 'from-blue-500 to-blue-600',
    path: '/bar',
    description: 'Icecek siparisleri'
  },
  kitchen: {
    name: 'Mutfak Paneli',
    icon: <FiGrid size={32} />,
    color: 'from-orange-500 to-orange-600',
    path: '/kitchen',
    description: 'Yemek siparisleri'
  },
  admin: {
    name: 'Yonetim Paneli',
    icon: <FiSettings size={32} />,
    color: 'from-purple-500 to-purple-600',
    path: '/admin',
    description: 'Kullanici ve sistem yonetimi'
  }
};

export default function SelectPanelPage() {
  const router = useRouter();
  const { user, currentBusiness, logout } = useStore();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    // Superadmin ise superadmin sayfasina yonlendir
    if (user.roles.includes('superadmin')) {
      router.replace('/superadmin');
      return;
    }
    if (!currentBusiness) {
      toast.error('Isletme bilgisi bulunamadi');
      router.replace('/login');
    }
  }, [user, currentBusiness, router]);

  const handleSelectPanel = (role: UserRole) => {
    if (role === 'superadmin') return;
    const panel = PANEL_INFO[role];
    router.push(panel.path);
  };

  const handleLogout = () => {
    logout();
    toast.success('Cikis yapildi');
    router.push('/login');
  };

  if (!user || !currentBusiness) {
    return null;
  }

  const availablePanels = user.roles
    .filter(role => role !== 'superadmin')
    .map(role => ({
      role,
      ...PANEL_INFO[role as Exclude<UserRole, 'superadmin'>]
    }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <Toaster position="top-center" />

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Merhaba, {user.name}</h1>
              <p className="opacity-80 text-sm">{currentBusiness.name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/20 rounded-lg transition"
              title="Cikis Yap"
            >
              <FiLogOut size={24} />
            </button>
          </div>
        </div>

        {/* Panels */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 text-center mb-2">Panel seciniz</p>
          {availablePanels.map(panel => (
            <button
              key={panel.role}
              onClick={() => handleSelectPanel(panel.role)}
              className={`w-full p-5 rounded-xl bg-gradient-to-r ${panel.color} text-white flex items-center gap-4 hover:opacity-90 transition shadow-lg`}
            >
              <div className="p-3 bg-white/20 rounded-xl">
                {panel.icon}
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg">{panel.name}</h3>
                <p className="text-sm opacity-80">{panel.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 text-xs text-gray-500 text-center">
          <p>{availablePanels.length} panel erisim yetkiniz var</p>
        </div>
      </div>
    </div>
  );
}
