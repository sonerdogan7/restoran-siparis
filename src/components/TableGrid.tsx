'use client';

import { Table } from '@/types';
import { useStore } from '@/store/useStore';
import { FiUsers } from 'react-icons/fi';

interface TableGridProps {
  tables: Table[];
  onTableSelect: (table: Table) => void;
}

export default function TableGrid({ tables, onTableSelect }: TableGridProps) {
  const { activeOrders } = useStore();

  const getTableOrder = (tableId: string) => {
    return activeOrders.find(o => o.tableId === tableId && o.status === 'active');
  };

  return (
    <div className="grid grid-cols-4 md:grid-cols-5 gap-3 p-4">
      {tables.map((table) => {
        const order = getTableOrder(table.id);
        const isOccupied = table.status === 'occupied';

        return (
          <button
            key={table.id}
            onClick={() => onTableSelect(table)}
            className={`
              relative p-4 rounded-xl shadow-lg transition-all duration-200
              transform hover:scale-105 active:scale-95
              ${isOccupied
                ? 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                : 'bg-gradient-to-br from-green-500 to-green-600 text-white'
              }
            `}
          >
            <div className="text-2xl font-bold">{table.number}</div>
            {isOccupied && (
              <div className="flex items-center justify-center gap-1 mt-1 text-sm opacity-90">
                <FiUsers size={14} />
                <span>{table.guestCount}</span>
              </div>
            )}
            {order && (
              <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
                {order.items.length}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
