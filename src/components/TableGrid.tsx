'use client';

import { Table } from '@/types';
import { useStore } from '@/store/useStore';
import { FiUsers, FiCheck } from 'react-icons/fi';

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

    orders.forEach(order => {
      order.items.forEach(item => {
        totalItems += item.quantity;
        if (item.status === 'ready') {
          readyItems += item.quantity;
        }
      });
    });

    return { totalItems, readyItems, orders };
  };

  return (
    <div className="grid grid-cols-4 md:grid-cols-5 gap-3 p-4">
      {tables.map((table) => {
        const { totalItems, readyItems, orders } = getTableItemsStatus(table.id);
        const isOccupied = table.status === 'occupied';
        const hasOrders = orders.length > 0;
        const allReady = totalItems > 0 && readyItems === totalItems;
        const someReady = readyItems > 0 && readyItems < totalItems;

        return (
          <button
            key={table.id}
            onClick={() => onTableSelect(table)}
            className={`
              relative p-3 rounded-xl shadow-lg transition-all duration-200
              transform hover:scale-105 active:scale-95
              ${isOccupied
                ? allReady
                  ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                  : 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
              }
            `}
          >
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
                    ? 'bg-yellow-400 text-yellow-900'
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

            {/* Siparis Sayisi Badge */}
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
