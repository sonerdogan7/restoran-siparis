'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Table, MenuItem, Order, OrderItem } from '@/types';
import TableGrid from '@/components/TableGrid';
import GuestCountModal from '@/components/GuestCountModal';
import MenuSelector from '@/components/MenuSelector';
import Cart from '@/components/Cart';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import { FiArrowLeft, FiList, FiGrid, FiLogOut, FiX } from 'react-icons/fi';

const INITIAL_TABLES: Table[] = Array.from({ length: 20 }, (_, i) => ({
  id: `table-${i + 1}`,
  number: i + 1,
  status: 'empty',
  guestCount: 0,
}));

export default function WaiterPage() {
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
    user
  } = useStore();

  const [view, setView] = useState<'tables' | 'order' | 'myOrders'>('tables');
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [pendingTable, setPendingTable] = useState<Table | null>(null);

  // Initialize tables and listen for changes
  useEffect(() => {
    

    const tablesRef = collection(db, 'tables');

    const unsubscribe = onSnapshot(tablesRef, (snapshot) => {
      if (snapshot.empty) {
        // Initialize tables if none exist
        INITIAL_TABLES.forEach(async (table) => {
          await setDoc(doc(db, 'tables', table.id), table);
        });
        setTables(INITIAL_TABLES);
      } else {
        const tablesData = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        })) as Table[];
        setTables(tablesData.sort((a, b) => a.number - b.number));
      }
    });

    return () => unsubscribe();
  }, [setTables]);

  // Listen for active orders
  useEffect(() => {
    

    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('status', '==', 'active'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Order[];
      setActiveOrders(ordersData);
    });

    return () => unsubscribe();
  }, [setActiveOrders]);

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
    if (!pendingTable || !db) return;

    try {
      await updateDoc(doc(db, 'tables', pendingTable.id), {
        status: 'occupied',
        guestCount,
        waiter: user?.name || 'Garson',
        openedAt: serverTimestamp(),
      });

      setCurrentTable({
        ...pendingTable,
        status: 'occupied',
        guestCount,
        waiter: user?.name || 'Garson',
      });

      setShowGuestModal(false);
      setPendingTable(null);
      setView('order');
      toast.success(`Masa ${pendingTable.number} açıldı`);
    } catch (error) {
      toast.error('Masa açılamadı');
    }
  };

  const handleAddItem = (item: MenuItem, quantity: number, notes?: string) => {
    addToCart(item, quantity, notes);
  };

  const handleSubmitOrder = async () => {
    if (!currentTable || cartItems.length === 0 || !db) return;

    try {
      const order: Omit<Order, 'id'> = {
        tableId: currentTable.id,
        tableNumber: currentTable.number,
        items: cartItems.map(item => ({
          ...item,
          createdAt: new Date(),
        })),
        waiter: user?.name || 'Garson',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        total: cartItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0),
      };

      await addDoc(collection(db, 'orders'), {
        ...order,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      clearCart();
      toast.success('Sipariş gönderildi!');

      // Show notification
      const barCount = cartItems.filter(i => i.menuItem.destination === 'bar').length;
      const kitchenCount = cartItems.filter(i => i.menuItem.destination === 'kitchen').length;

      if (barCount > 0) toast(`🍺 ${barCount} ürün Bara gönderildi`, { icon: '📤' });
      if (kitchenCount > 0) toast(`🍳 ${kitchenCount} ürün Mutfağa gönderildi`, { icon: '📤' });

    } catch (error) {
      toast.error('Sipariş gönderilemedi');
    }
  };

  const handleCloseTable = async () => {
    if (!currentTable || !db) return;

    const hasActiveOrders = activeOrders.some(
      o => o.tableId === currentTable.id && o.status === 'active'
    );

    if (hasActiveOrders) {
      toast.error('Aktif siparişler var, önce tamamlayın');
      return;
    }

    try {
      await updateDoc(doc(db, 'tables', currentTable.id), {
        status: 'empty',
        guestCount: 0,
        waiter: null,
        openedAt: null,
      });

      toast.success(`Masa ${currentTable.number} kapatıldı`);
      setCurrentTable(null);
      clearCart();
      setView('tables');
    } catch (error) {
      toast.error('Masa kapatılamadı');
    }
  };

  const myActiveOrders = activeOrders.filter(o =>
    o.waiter === (user?.name || 'Garson') && o.status === 'active'
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          {view !== 'tables' && (
            <button
              onClick={() => {
                setView('tables');
                setCurrentTable(null);
                clearCart();
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <FiArrowLeft size={24} />
            </button>
          )}
          <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">
            {view === 'tables' && 'Masalar'}
            {view === 'order' && `Masa ${currentTable?.number}`}
            {view === 'myOrders' && 'Siparişlerim'}
          </h1>
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
          </div>
        </div>
      </header>

      {/* Tables View */}
      {view === 'tables' && (
        <TableGrid tables={tables} onTableSelect={handleTableSelect} />
      )}

      {/* Order View */}
      {view === 'order' && currentTable && (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-60px)]">
          {/* Menu Section */}
          <div className="flex-1 overflow-auto bg-gray-50">
            <MenuSelector onAddItem={handleAddItem} />
          </div>

          {/* Cart Section */}
          <div className="w-full lg:w-96 bg-white border-t lg:border-l lg:border-t-0 flex flex-col">
            <Cart
              items={cartItems}
              onRemove={removeFromCart}
              onUpdateQuantity={updateCartItem}
              onSubmit={handleSubmitOrder}
              tableNumber={currentTable.number}
            />

            {/* Close Table Button */}
            {currentTable.status === 'occupied' && (
              <div className="p-4 border-t">
                <button
                  onClick={handleCloseTable}
                  className="w-full py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition flex items-center justify-center gap-2"
                >
                  <FiX />
                  Masayı Kapat
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* My Orders View */}
      {view === 'myOrders' && (
        <div className="p-4 space-y-4">
          {myActiveOrders.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Aktif siparişiniz yok
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
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        item.status === 'ready'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {item.status === 'ready' ? 'Hazır' : 'Hazırlanıyor'}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between items-center">
                  <span className="text-gray-600">Toplam</span>
                  <span className="font-bold text-lg">{order.total} ₺</span>
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
    </div>
  );
}
