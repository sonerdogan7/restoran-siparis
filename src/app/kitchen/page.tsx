'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Order } from '@/types';
import { subscribeToOrders, updateOrder } from '@/lib/firebaseHelpers';
import toast, { Toaster } from 'react-hot-toast';
import { FiCheck, FiClock, FiPrinter, FiVolume2, FiVolumeX, FiArrowLeft, FiLogOut } from 'react-icons/fi';

export default function KitchenPage() {
  const router = useRouter();
  const { user, currentBusiness, logout } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevOrderCount = useRef(0);

  // Yetki kontrolu
  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!user.roles.includes('kitchen') && !user.roles.includes('admin')) {
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

  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
  }, []);

  useEffect(() => {
    if (!currentBusiness) return;

    const unsubscribe = subscribeToOrders(currentBusiness.id, 'active', (ordersData) => {
      // Filter orders that have kitchen items
      const kitchenOrders = ordersData.filter(order =>
        order.items.some(item => item.menuItem.destination === 'kitchen')
      );

      // Play sound on new order
      if (kitchenOrders.length > prevOrderCount.current && soundEnabled && audioRef.current) {
        audioRef.current.play().catch(() => {});
        toast('Yeni siparis geldi!', { icon: '🔔' });
      }
      prevOrderCount.current = kitchenOrders.length;

      setOrders(kitchenOrders);
    });

    return () => unsubscribe();
  }, [currentBusiness, soundEnabled]);

  const handleMarkItemReady = async (orderId: string, itemId: string) => {
    if (!currentBusiness) return;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const updatedItems = order.items.map(item =>
      item.id === itemId ? { ...item, status: 'ready' as const } : item
    );

    try {
      await updateOrder(currentBusiness.id, orderId, { items: updatedItems });
      toast.success('Urun hazir olarak isaretlendi');
    } catch (error) {
      toast.error('Guncelleme basarisiz');
    }
  };

  const handleMarkAllReady = async (orderId: string) => {
    if (!currentBusiness) return;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const updatedItems = order.items.map(item =>
      item.menuItem.destination === 'kitchen'
        ? { ...item, status: 'ready' as const }
        : item
    );

    try {
      await updateOrder(currentBusiness.id, orderId, { items: updatedItems });
      toast.success('Tum urunler hazir!');
    } catch (error) {
      toast.error('Guncelleme basarisiz');
    }
  };

  const handlePrint = (order: Order) => {
    const kitchenItems = order.items.filter(i => i.menuItem.destination === 'kitchen');
    const printWindow = window.open('', '', 'width=300,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Mutfak Fisi</title>
            <style>
              body { font-family: 'Courier New', monospace; padding: 10px; max-width: 280px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
              .title { font-size: 20px; font-weight: bold; }
              .info { font-size: 12px; margin: 5px 0; }
              .item { margin: 8px 0; font-size: 14px; }
              .qty { font-weight: bold; }
              .note { font-size: 11px; color: #666; margin-left: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">MUTFAK</div>
              <div class="info">Masa: ${order.tableNumber}</div>
              <div class="info">Garson: ${order.waiter}</div>
              <div class="info">${new Date(order.createdAt).toLocaleTimeString('tr-TR')}</div>
            </div>
            ${kitchenItems.map(item => `
              <div class="item">
                <span class="qty">${item.quantity}x</span> ${item.menuItem.name}
                ${item.notes ? '<div class="note">Not: ' + item.notes + '</div>' : ''}
              </div>
            `).join('')}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getTimeSince = (date: Date) => {
    return Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  };

  if (!user || !currentBusiness) {
    return null;
  }

  return (
    <div className="min-h-screen bg-orange-50">
      <Toaster position="top-center" />

      <header className="bg-orange-600 text-white shadow-lg sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={() => router.push('/select-panel')}
            className="p-2 hover:bg-orange-500 rounded-lg"
          >
            <FiArrowLeft size={24} />
          </button>
          <div className="text-center flex-1">
            <h1 className="text-xl font-bold">MUTFAK PANELI</h1>
            <p className="text-xs opacity-80">{currentBusiness.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-orange-500 px-3 py-1 rounded-full text-sm">
              {orders.length} Siparis
            </span>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 hover:bg-orange-500 rounded-lg"
            >
              {soundEnabled ? <FiVolume2 size={24} /> : <FiVolumeX size={24} />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-orange-500 rounded-lg"
            >
              <FiLogOut size={24} />
            </button>
          </div>
        </div>
      </header>

      <div className="p-4">
        {orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🍳</div>
            <p className="text-xl text-gray-500">Bekleyen siparis yok</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.map(order => {
              const kitchenItems = order.items.filter(i => i.menuItem.destination === 'kitchen');
              const allReady = kitchenItems.every(i => i.status === 'ready');
              const pendingCount = kitchenItems.filter(i => i.status !== 'ready').length;
              const minutes = getTimeSince(order.createdAt);
              const isUrgent = minutes > 15;

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-xl shadow-lg overflow-hidden border-2 ${
                    allReady ? 'border-green-400' : isUrgent ? 'border-red-400 animate-pulse' : 'border-orange-200'
                  }`}
                >
                  <div className={`p-4 ${
                    allReady ? 'bg-green-500' : isUrgent ? 'bg-red-500' : 'bg-orange-600'
                  } text-white`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-3xl font-bold">M{order.tableNumber}</span>
                        <div className="text-sm opacity-90">{order.waiter}</div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xl font-bold">
                          <FiClock />
                          {minutes}dk
                        </div>
                        {pendingCount > 0 && (
                          <div className="text-sm">{pendingCount} bekliyor</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    {kitchenItems.map(item => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          item.status === 'ready'
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-yellow-50 border border-yellow-200'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xl font-bold ${
                              item.status === 'ready' ? 'text-green-600' : 'text-yellow-600'
                            }`}>
                              {item.quantity}x
                            </span>
                            <span className="font-medium">{item.menuItem.name}</span>
                          </div>
                          {item.notes && (
                            <div className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded mt-1">
                              Not: {item.notes}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleMarkItemReady(order.id, item.id)}
                          disabled={item.status === 'ready'}
                          className={`p-2 rounded-lg ${
                            item.status === 'ready'
                              ? 'bg-green-200 text-green-700'
                              : 'bg-green-500 text-white hover:bg-green-600'
                          }`}
                        >
                          <FiCheck size={20} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 border-t bg-gray-50 flex gap-2">
                    <button
                      onClick={() => handlePrint(order)}
                      className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-300"
                    >
                      <FiPrinter /> Yazdir
                    </button>
                    {!allReady && (
                      <button
                        onClick={() => handleMarkAllReady(order.id)}
                        className="flex-1 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600"
                      >
                        Tumu Hazir
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
