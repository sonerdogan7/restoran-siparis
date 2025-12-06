'use client';

import { Order, OrderItem } from '@/types';
import { FiCheck, FiClock, FiPrinter } from 'react-icons/fi';

interface KitchenOrderCardProps {
  order: Order;
  destination: 'bar' | 'kitchen';
  onMarkReady: (orderId: string, itemId: string) => void;
  onMarkAllReady: (orderId: string) => void;
  onPrint: () => void;
}

export default function KitchenOrderCard({
  order,
  destination,
  onMarkReady,
  onMarkAllReady,
  onPrint
}: KitchenOrderCardProps) {
  const items = order.items.filter(item => item.menuItem.destination === destination);

  if (items.length === 0) return null;

  const allReady = items.every(item => item.status === 'ready');
  const pendingCount = items.filter(item => item.status === 'pending').length;

  const getTimeSince = (date: Date) => {
    const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    return minutes;
  };

  const minutes = getTimeSince(order.createdAt);
  const isUrgent = minutes > 15;

  return (
    <div className={`bg-white rounded-xl shadow-lg overflow-hidden border-2 ${
      allReady ? 'border-green-400' : isUrgent ? 'border-red-400' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className={`p-4 ${
        allReady ? 'bg-green-500' : isUrgent ? 'bg-red-500' : 'bg-gray-800'
      } text-white`}>
        <div className="flex justify-between items-center">
          <div>
            <span className="text-2xl font-bold">Masa {order.tableNumber}</span>
            <div className="text-sm opacity-80">Garson: {order.waiter}</div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <FiClock />
              <span className="text-lg font-bold">{minutes} dk</span>
            </div>
            {pendingCount > 0 && (
              <div className="text-sm">{pendingCount} bekliyor</div>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="p-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between p-3 rounded-lg ${
              item.status === 'ready'
                ? 'bg-green-50 border border-green-200'
                : 'bg-yellow-50 border border-yellow-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold ${
                item.status === 'ready' ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {item.quantity}x
              </span>
              <div>
                <span className="font-medium text-gray-800">{item.menuItem.name}</span>
                {item.notes && (
                  <p className="text-sm text-gray-500">Not: {item.notes}</p>
                )}
              </div>
            </div>

            <button
              onClick={() => onMarkReady(order.id, item.id)}
              disabled={item.status === 'ready'}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                item.status === 'ready'
                  ? 'bg-green-200 text-green-700 cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {item.status === 'ready' ? (
                <span className="flex items-center gap-1">
                  <FiCheck /> Hazır
                </span>
              ) : (
                'Hazırlandı'
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="p-4 border-t bg-gray-50 flex gap-2">
        <button
          onClick={onPrint}
          className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-300 transition"
        >
          <FiPrinter />
          Yazdır
        </button>
        {!allReady && (
          <button
            onClick={() => onMarkAllReady(order.id)}
            className="flex-1 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition"
          >
            Tümü Hazır
          </button>
        )}
      </div>
    </div>
  );
}
