'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Table, MenuItem, Order, OrderItem } from '@/types';
import TableGrid from '@/components/TableGrid';
import GuestCountModal from '@/components/GuestCountModal';
import MenuSelector from '@/components/MenuSelector';
import Cart from '@/components/Cart';
import {
  subscribeToTables,
  subscribeToOrders,
  updateTable,
  createOrder,
  initializeTables
} from '@/lib/firebaseHelpers';
import toast, { Toaster } from 'react-hot-toast';
import { FiArrowLeft, FiList, FiGrid, FiLogOut, FiX, FiStar, FiShoppingCart, FiChevronUp, FiChevronDown } from 'react-icons/fi';

export default function WaiterPage() {
  const router = useRouter();
  const {
    tables,
    setTables,
    currentTable,
    setCurrentTable,
    cartItems,
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    activeOrders,
    setActiveOrders,
    user,
    currentBusiness,
    logout
  } = useStore();

  const [view, setView] = useState<'tables' | 'order' | 'myOrders'>('tables');
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [pendingTable, setPendingTable] = useState<Table | null>(null);
  const [tableTab, setTableTab] = useState<'all' | 'myTables'>('all');
  const [isCartExpanded, setIsCartExpanded] = useState(false);

  // Yetki kontrolu
  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!user.roles.includes('waiter') && !user.roles.includes('admin')) {
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

  // Garsonun aktif masalari (dolu olan ve garsonun actigi masalar)
  const myTables = tables.filter(t =>
    t.status === 'occupied' && t.waiter === (user?.name || 'Garson')
  );

  // Initialize tables and listen for changes
  useEffect(() => {
    if (!currentBusiness) return;

    const unsubscribe = subscribeToTables(currentBusiness.id, (tablesData) => {
      if (tablesData.length === 0) {
        // Initialize tables if none exist
        initializeTables(currentBusiness.id, currentBusiness.tableCount);
      } else {
        setTables(tablesData);
      }
    });

    return () => unsubscribe();
  }, [currentBusiness, setTables]);

  // Listen for active orders
  useEffect(() => {
    if (!currentBusiness) return;

    const unsubscribe = subscribeToOrders(currentBusiness.id, 'active', (ordersData) => {
      setActiveOrders(ordersData);
    });

    return () => unsubscribe();
  }, [currentBusiness, setActiveOrders]);

  const handleTableSelect = (table: Table) => {
    if (table.status === 'empty') {
      setPendingTable(table);
      setShowGuestModal(true);
    } else {
      setCurrentTable(table);
      setView('order');
    }
  };

  const handleOpenTable = async (guestCount: number) => {
    if (!pendingTable || !currentBusiness) return;

    try {
      await updateTable(currentBusiness.id, pendingTable.id, {
        status: 'occupied',
        guestCount,
        waiter: user?.name || 'Garson',
        waiterId: user?.id,
        openedAt: new Date()
      });

      setCurrentTable({
        ...pendingTable,
        status: 'occupied',
        guestCount,
        waiter: user?.name || 'Garson',
        waiterId: user?.id
      });

      setShowGuestModal(false);
      setPendingTable(null);
      setView('order');
      toast.success(`Masa ${pendingTable.number} acildi`);
    } catch (error) {
      toast.error('Masa acilamadi');
    }
  };

  const handleAddItem = (item: MenuItem, quantity: number, notes?: string, seatNumber?: number) => {
    addToCart(item, quantity, notes, seatNumber);
  };

  const handleSubmitOrder = async () => {
    if (!currentTable || cartItems.length === 0 || !currentBusiness || !user) return;

    try {
      const order: Omit<Order, 'id'> = {
        tableId: currentTable.id,
        tableNumber: currentTable.number,
        items: cartItems.map(item => ({
          ...item,
          createdAt: new Date(),
        })),
        waiter: user.name,
        waiterId: user.id,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        total: cartItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0),
      };

      await createOrder(currentBusiness.id, order);

      clearCart();
      setIsCartExpanded(false);
      toast.success('Siparis gonderildi!');

      // Show notification
      const barCount = cartItems.filter(i => i.menuItem.destination === 'bar').length;
      const kitchenCount = cartItems.filter(i => i.menuItem.destination === 'kitchen').length;

      if (barCount > 0) toast(`${barCount} urun Bara gonderildi`, { icon: '🍺' });
      if (kitchenCount > 0) toast(`${kitchenCount} urun Mutfaga gonderildi`, { icon: '🍳' });

    } catch (error) {
      toast.error('Siparis gonderilemedi');
    }
  };

  const handleCloseTable = async () => {
    if (!currentTable || !currentBusiness) return;

    const hasActiveOrders = activeOrders.some(
      o => o.tableId === currentTable.id && o.status === 'active'
    );

    if (hasActiveOrders) {
      toast.error('Aktif siparisler var, once tamamlayin');
      return;
    }

    try {
      await updateTable(currentBusiness.id, currentTable.id, {
        status: 'empty',
        guestCount: 0,
        waiter: undefined,
        waiterId: undefined,
        openedAt: undefined
      });

      toast.success(`Masa ${currentTable.number} kapatildi`);
      setCurrentTable(null);
      clearCart();
      setView('tables');
    } catch (error) {
      toast.error('Masa kapatilamadi');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const myActiveOrders = activeOrders.filter(o =>
    o.waiterId === user?.id && o.status === 'active'
  );

  const cartTotal = cartItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);

  if (!user || !currentBusiness) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          {view !== 'tables' ? (
            <button
              onClick={() => {
                setView('tables');
                setCurrentTable(null);
                setIsCartExpanded(false);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <FiArrowLeft size={24} />
            </button>
          ) : (
            <button
              onClick={() => router.push('/select-panel')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <FiArrowLeft size={24} />
            </button>
          )}
          <div className="text-center flex-1">
            <h1 className="text-lg font-bold text-gray-800">
              {view === 'tables' && 'Masalar'}
              {view === 'order' && `Masa ${currentTable?.number}`}
              {view === 'myOrders' && 'Siparislerim'}
            </h1>
            <p className="text-xs text-gray-500">{currentBusiness.name}</p>
          </div>
          <div className="flex gap-2">
            {view === 'tables' && (
              <button
                onClick={() => setView('myOrders')}
                className="p-2 hover:bg-gray-100 rounded-lg relative"
              >
                <FiList size={24} />
                {myActiveOrders.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {myActiveOrders.length}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-lg text-red-500"
            >
              <FiLogOut size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Tables View */}
      {view === 'tables' && (
        <>
          {/* Tab Secimi */}
          <div className="bg-white border-b px-4 py-2">
            <div className="flex gap-2">
              <button
                onClick={() => setTableTab('all')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  tableTab === 'all'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FiGrid className="inline mr-2" />
                Tum Masalar
              </button>
              <button
                onClick={() => setTableTab('myTables')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all relative ${
                  tableTab === 'myTables'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FiStar className="inline mr-2" />
                Masalarim
                {myTables.length > 0 && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    tableTab === 'myTables' ? 'bg-yellow-600' : 'bg-yellow-500 text-white'
                  }`}>
                    {myTables.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Masa Listesi */}
          {tableTab === 'all' ? (
            <TableGrid tables={tables} onTableSelect={handleTableSelect} />
          ) : (
            myTables.length > 0 ? (
              <TableGrid tables={myTables} onTableSelect={handleTableSelect} />
            ) : (
              <div className="text-center py-20">
                <FiStar className="mx-auto text-gray-300" size={64} />
                <p className="mt-4 text-gray-500 text-lg">Henuz aktif masaniz yok</p>
                <p className="text-gray-400 text-sm">Bir masa actiginizda burada gorunecek</p>
              </div>
            )
          )}
        </>
      )}

      {/* Order View - Yeni Tasarim */}
      {view === 'order' && currentTable && (
        <div className="relative min-h-[calc(100vh-60px)]">
          {/* Menu Section - Full Screen */}
          <div className="pb-20">
            <MenuSelector
              onAddItem={handleAddItem}
              guestCount={currentTable.guestCount}
            />
          </div>

          {/* Floating Cart Button - Sepet kapali iken */}
          {!isCartExpanded && (
            <button
              onClick={() => setIsCartExpanded(true)}
              className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-green-500 text-white px-4 py-3 rounded-full shadow-lg hover:bg-green-600 transition-all"
            >
              <FiShoppingCart size={20} />
              {cartItems.length > 0 ? (
                <>
                  <span className="font-bold">{cartItems.length}</span>
                  <span className="text-sm">|</span>
                  <span className="font-semibold">{cartTotal} TL</span>
                </>
              ) : (
                <span>Sepet</span>
              )}
            </button>
          )}

          {/* Masa Kapat Butonu */}
          {!isCartExpanded && currentTable.status === 'occupied' && (
            <button
              onClick={handleCloseTable}
              className="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-red-500 text-white px-4 py-3 rounded-full shadow-lg hover:bg-red-600 transition-all"
            >
              <FiX size={20} />
              <span>Kapat</span>
            </button>
          )}

          {/* Expanded Cart Panel */}
          {isCartExpanded && (
            <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col animate-slide-up">
              {/* Cart Header */}
              <button
                onClick={() => setIsCartExpanded(false)}
                className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-2xl"
              >
                <div className="flex items-center gap-2">
                  <FiShoppingCart size={20} className="text-green-600" />
                  <span className="font-semibold text-gray-800">
                    Sepet ({cartItems.length} urun)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-green-600">{cartTotal} TL</span>
                  <FiChevronDown size={24} className="text-gray-500" />
                </div>
              </button>

              {/* Cart Content */}
              <div className="flex-1 overflow-auto">
                <Cart
                  items={cartItems}
                  onRemove={removeFromCart}
                  onUpdateQuantity={updateCartItem}
                  onSubmit={handleSubmitOrder}
                  tableNumber={currentTable.number}
                  guestCount={currentTable.guestCount}
                />
              </div>

              {/* Masa Kapat */}
              {currentTable.status === 'occupied' && (
                <div className="p-3 border-t bg-gray-50">
                  <button
                    onClick={handleCloseTable}
                    className="w-full py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition flex items-center justify-center gap-2"
                  >
                    <FiX />
                    Masayi Kapat
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* My Orders View */}
      {view === 'myOrders' && (
        <div className="p-4 space-y-4">
          {myActiveOrders.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Aktif siparisiniz yok
            </div>
          ) : (
            myActiveOrders.map(order => (
              <div key={order.id} className="bg-white rounded-xl shadow p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-lg font-bold">Masa {order.tableNumber}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="space-y-2">
                  {order.items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        <span className="font-medium">{item.quantity}x</span> {item.menuItem.name}
                        {item.seatNumber && (
                          <span className="ml-1 text-xs text-indigo-600">({item.seatNumber}. san.)</span>
                        )}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        item.status === 'ready'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {item.status === 'ready' ? 'Hazir' : 'Hazirlaniyor'}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between items-center">
                  <span className="text-gray-600">Toplam</span>
                  <span className="font-bold text-lg">{order.total} TL</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Guest Count Modal */}
      {showGuestModal && pendingTable && (
        <GuestCountModal
          tableNumber={pendingTable.number}
          onConfirm={handleOpenTable}
          onClose={() => {
            setShowGuestModal(false);
            setPendingTable(null);
          }}
        />
      )}

      {/* Custom Styles */}
      <style jsx global>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
