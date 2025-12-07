'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Order, OrderItem } from '@/types';
import { subscribeToOrders, updateOrder } from '@/lib/firebaseHelpers';
import toast, { Toaster } from 'react-hot-toast';
import { FiCheck, FiClock, FiPrinter, FiVolume2, FiVolumeX, FiArrowLeft, FiLogOut } from 'react-icons/fi';

// Ayni urunleri birlestir (notu olmayanlar)
interface MergedItem {
  menuItemId: string;
  menuItemName: string;
  totalQuantity: number;
  items: OrderItem[]; // Orijinal itemlar (hazir isaretlemek icin)
  hasNotes: boolean;
  allReady: boolean;
}

function mergeItems(items: OrderItem[]): MergedItem[] {
  const merged: Record<string, MergedItem> = {};
  const withNotes: MergedItem[] = [];

  items.forEach(item => {
    // Notu olan urunler ayri gosterilir
    if (item.notes) {
      withNotes.push({
        menuItemId: item.menuItem.id,
        menuItemName: item.menuItem.name,
        totalQuantity: item.quantity,
        items: [item],
        hasNotes: true,
        allReady: item.status === 'ready'
      });
    } else {
      // Notu olmayan ayni urunleri birlestir
      const key = item.menuItem.id;
      if (!merged[key]) {
        merged[key] = {
          menuItemId: item.menuItem.id,
          menuItemName: item.menuItem.name,
          totalQuantity: 0,
          items: [],
          hasNotes: false,
          allReady: true
        };
      }
      merged[key].totalQuantity += item.quantity;
      merged[key].items.push(item);
      if (item.status !== 'ready') {
        merged[key].allReady = false;
      }
    }
  });

  return [...Object.values(merged), ...withNotes];
}

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

  // Birlestirilmis urunleri hazir isaretle (tum siparislerdeki ayni urunler)
  const handleMarkMergedItemsReady = async (mergedItem: MergedItem) => {
    if (!currentBusiness) return;

    try {
      // Her bir orijinal item icin guncelleme yap
      for (const item of mergedItem.items) {
        // Bu item hangi sipariste?
        const order = orders.find(o => o.items.some(i => i.id === item.id));
        if (!order) continue;

        const updatedItems = order.items.map(i =>
          i.id === item.id ? { ...i, status: 'ready' as const } : i
        );

        await updateOrder(currentBusiness.id, order.id, { items: updatedItems });
      }
      toast.success(`${mergedItem.totalQuantity}x ${mergedItem.menuItemName} hazir!`);
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
          (() => {
            // Tum siparislerden mutfak urunlerini topla
            const allKitchenItems: OrderItem[] = [];
            orders.forEach(order => {
              order.items
                .filter(i => i.menuItem.destination === 'kitchen')
                .forEach(item => allKitchenItems.push(item));
            });

            // Urunleri birlestir
            const mergedItems = mergeItems(allKitchenItems);
            const pendingMerged = mergedItems.filter(m => !m.allReady);
            const readyMerged = mergedItems.filter(m => m.allReady);

            // En eski siparisin zamani
            const oldestOrder = orders.reduce((oldest, order) =>
              new Date(order.createdAt) < new Date(oldest.createdAt) ? order : oldest
            , orders[0]);
            const minutes = getTimeSince(oldestOrder.createdAt);
            const isUrgent = minutes > 15;

            return (
              <div className="space-y-4">
                {/* Ozet Bilgi */}
                <div className={`p-4 rounded-xl text-white ${isUrgent ? 'bg-red-500' : 'bg-orange-600'}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-2xl font-bold">{pendingMerged.length} Urun Bekliyor</div>
                      <div className="text-sm opacity-90">
                        {orders.length} siparis, {[...new Set(orders.map(o => o.tableNumber))].length} masa
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xl font-bold">
                        <FiClock />
                        {minutes}dk
                      </div>
                      <div className="text-sm opacity-90">en eski</div>
                    </div>
                  </div>
                </div>

                {/* Bekleyen Urunler */}
                {pendingMerged.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-700 mb-3">Hazirlanacak</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {pendingMerged.map((mergedItem, idx) => (
                        <div
                          key={`${mergedItem.menuItemId}-${idx}`}
                          className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-yellow-300"
                        >
                          <div className="p-4 flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className="text-3xl font-bold text-yellow-600">
                                  {mergedItem.totalQuantity}x
                                </span>
                                <span className="text-lg font-medium">{mergedItem.menuItemName}</span>
                              </div>
                              {mergedItem.hasNotes && mergedItem.items[0]?.notes && (
                                <div className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded mt-2">
                                  Not: {mergedItem.items[0].notes}
                                </div>
                              )}
                              {!mergedItem.hasNotes && mergedItem.items.length > 1 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {mergedItem.items.length} farkli siparis
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleMarkMergedItemsReady(mergedItem)}
                              className="p-3 bg-green-500 text-white rounded-xl hover:bg-green-600"
                            >
                              <FiCheck size={24} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hazir Urunler */}
                {readyMerged.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-700 mb-3">Hazir ({readyMerged.length})</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {readyMerged.map((mergedItem, idx) => (
                        <div
                          key={`ready-${mergedItem.menuItemId}-${idx}`}
                          className="bg-green-50 border border-green-200 rounded-lg p-3 text-center"
                        >
                          <span className="text-lg font-bold text-green-600">
                            {mergedItem.totalQuantity}x
                          </span>
                          <div className="text-sm text-green-700 truncate">{mergedItem.menuItemName}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Masa Detaylari */}
                <div>
                  <h3 className="text-lg font-bold text-gray-700 mb-3">Masa Detaylari</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {orders.map(order => {
                      const kitchenItems = order.items.filter(i => i.menuItem.destination === 'kitchen');
                      const pendingCount = kitchenItems.filter(i => i.status !== 'ready').length;
                      const allReady = pendingCount === 0;

                      return (
                        <div
                          key={order.id}
                          className={`p-3 rounded-lg text-center ${
                            allReady ? 'bg-green-100 border border-green-300' : 'bg-yellow-100 border border-yellow-300'
                          }`}
                        >
                          <div className="font-bold">M{order.tableNumber}</div>
                          <div className="text-xs text-gray-600">{kitchenItems.length} urun</div>
                          {!allReady && (
                            <div className="text-xs text-yellow-700">{pendingCount} bekliyor</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
