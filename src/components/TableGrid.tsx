'use client';

import { Table } from '@/types';
import { useStore } from '@/store/useStore';
import { FiUsers, FiCheck, FiAlertCircle } from 'react-icons/fi';

interface TableGridProps {
  tables: Table[];
  onTableSelect: (table: Table) => void;
}

export default function TableGrid({ tables, onTableSelect }: TableGridProps) {
  const { activeOrders } = useStore();

  // Masaya ait tum siparisleri getir
  const getTableOrders = (tableId: string) => {
    return activeOrders.filter(o => o.tableId === tableId && o.status === 'active');
  };

  // Masadaki tum urunlerin durumunu hesapla
  const getTableItemsStatus = (tableId: string) => {
    const orders = getTableOrders(tableId);
    let totalItems = 0;
    let readyItems = 0;
    let oldestOrderTime: Date | null = null;

    orders.forEach(order => {
      // En eski siparis zamanini bul
      const orderTime = new Date(order.createdAt);
      if (!oldestOrderTime || orderTime < oldestOrderTime) {
        oldestOrderTime = orderTime;
      }

      order.items.forEach(item => {
        totalItems += item.quantity;
        if (item.status === 'ready') {
          readyItems += item.quantity;
        }
      });
    });

    return { totalItems, readyItems, orders, oldestOrderTime };
  };

  // Hazir urunu olan masalari siparis zamanina gore sirala (oncelik icin)
  const getReadyTablesPriority = () => {
    const tablesWithReady: { tableId: string; tableNumber: number; oldestOrderTime: Date; readyItems: number }[] = [];

    tables.forEach(table => {
      if (table.status !== 'occupied') return;
      const { readyItems, oldestOrderTime } = getTableItemsStatus(table.id);
      if (readyItems > 0 && oldestOrderTime) {
        tablesWithReady.push({
          tableId: table.id,
          tableNumber: table.number,
          oldestOrderTime,
          readyItems
        });
      }
    });

    // En eski siparis once gelecek sekilde sirala
    tablesWithReady.sort((a, b) => a.oldestOrderTime.getTime() - b.oldestOrderTime.getTime());

    return tablesWithReady;
  };

  const readyTablesPriority = getReadyTablesPriority();

  // Masanin oncelik sirasini bul (1 = en oncelikli)
  const getTablePriority = (tableId: string): number | null => {
    const index = readyTablesPriority.findIndex(t => t.tableId === tableId);
    return index >= 0 ? index + 1 : null;
  };

  return (
    <div className="grid grid-cols-4 md:grid-cols-5 gap-3 p-4">
      {tables.map((table) => {
        const { totalItems, readyItems, orders, oldestOrderTime } = getTableItemsStatus(table.id);
        const isOccupied = table.status === 'occupied';
        const hasOrders = orders.length > 0;
        const allReady = totalItems > 0 && readyItems === totalItems;
        const someReady = readyItems > 0 && readyItems < totalItems;
        const priority = getTablePriority(table.id);
        const isFirstPriority = priority === 1;

        return (
          <button
            key={table.id}
            onClick={() => onTableSelect(table)}
            className={`
              relative p-3 rounded-xl shadow-lg transition-all duration-200
              transform hover:scale-105 active:scale-95
              ${isOccupied
                ? allReady
                  ? isFirstPriority
                    ? 'bg-gradient-to-br from-green-400 to-green-500 text-white ring-4 ring-green-300 ring-opacity-50'
                    : 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                  : someReady
                    ? isFirstPriority
                      ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-yellow-900 ring-4 ring-yellow-300 ring-opacity-50'
                      : 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-yellow-900'
                    : 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
              }
            `}
          >
            {/* Oncelik Badge - En oncelikli masa */}
            {isFirstPriority && readyItems > 0 && (
              <div className="absolute -top-2 -left-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center animate-pulse">
                1
              </div>
            )}

            {/* Diger oncelik siralari */}
            {priority && priority > 1 && priority <= 3 && (
              <div className="absolute -top-1 -left-1 bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {priority}
              </div>
            )}

            {/* Masa Numarasi */}
            <div className="text-2xl font-bold">{table.number}</div>

            {/* Kisi Sayisi */}
            {isOccupied && (
              <div className="flex items-center justify-center gap-1 text-xs opacity-90">
                <FiUsers size={12} />
                <span>{table.guestCount}</span>
              </div>
            )}

            {/* Siparis Durumu */}
            {isOccupied && hasOrders && (
              <div className={`mt-1 text-xs font-bold rounded-md px-1.5 py-0.5 ${
                allReady
                  ? 'bg-white/30 text-white'
                  : someReady
                    ? 'bg-white/30'
                    : 'bg-white/20 text-white'
              }`}>
                {allReady ? (
                  <span className="flex items-center justify-center gap-1">
                    <FiCheck size={10} /> Hazir
                  </span>
                ) : (
                  <span>{readyItems}/{totalItems}</span>
                )}
              </div>
            )}

            {/* Siparis Yok Gosterimi */}
            {isOccupied && !hasOrders && (
              <div className="mt-1 text-xs opacity-70">
                Siparis yok
              </div>
            )}

            {/* Siparis Sayisi Badge (birden fazla siparis varsa) */}
            {orders.length > 1 && (
              <div className="absolute -top-1 -right-1 bg-indigo-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {orders.length}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
