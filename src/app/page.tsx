'use client';

import { useRouter } from 'next/navigation';
import { FiCoffee, FiUsers, FiMonitor } from 'react-icons/fi';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Logo & Title */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🍽️</div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Restoran POS
          </h1>
          <p className="text-xl text-gray-300">
            Sipariş Yönetim Sistemi
          </p>
        </div>

        {/* Panel Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Waiter */}
          <button
            onClick={() => router.push('/waiter')}
            className="group bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center hover:bg-white/20 transition-all duration-300 transform hover:scale-105 border border-white/20"
          >
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <FiUsers className="text-white" size={36} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Garson</h2>
            <p className="text-gray-300">Masa yönetimi ve sipariş alma</p>
          </button>

          {/* Bar */}
          <button
            onClick={() => router.push('/bar')}
            className="group bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center hover:bg-white/20 transition-all duration-300 transform hover:scale-105 border border-white/20"
          >
            <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <FiCoffee className="text-white" size={36} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Bar</h2>
            <p className="text-gray-300">İçecek siparişleri</p>
          </button>

          {/* Kitchen */}
          <button
            onClick={() => router.push('/kitchen')}
            className="group bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center hover:bg-white/20 transition-all duration-300 transform hover:scale-105 border border-white/20"
          >
            <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <FiMonitor className="text-white" size={36} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Mutfak</h2>
            <p className="text-gray-300">Yemek siparişleri</p>
          </button>
        </div>

        {/* Login Link */}
        <div className="text-center">
          <button
            onClick={() => router.push('/login')}
            className="px-8 py-3 bg-white/10 backdrop-blur-lg text-white rounded-full font-medium hover:bg-white/20 transition border border-white/20"
          >
            Giriş Yap
          </button>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-400 text-sm">
          <p>Restoran & Otel Sipariş Yönetim Sistemi</p>
          <p className="mt-1">Realtime sipariş takibi • Bar & Mutfak ayrımı • Fiş yazdırma</p>
        </div>
      </div>
    </div>
  );
}
