'use client';

import { OrderItem } from '@/types';
import { FiTrash2, FiMinus, FiPlus, FiUser } from 'react-icons/fi';

interface CartProps {
  items: OrderItem[];
  onRemove: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onSubmit: () => void;
  tableNumber: number;
  guestCount?: number;
}

export default function Cart({ items, onRemove, onUpdateQuantity, onSubmit, tableNumber, guestCount }: CartProps) {
  const total = items.reduce((sum, item) => sum + ((item.menuItem.price || 0) * item.quantity), 0);

  // Sandalye bazli gruplama
  const itemsBySeat: Record<number | string, OrderItem[]> = {};
  items.forEach(item => {
    const seatKey = item.seatNumber || 'genel';
    if (!itemsBySeat[seatKey]) {
      itemsBySeat[seatKey] = [];
    }
    itemsBySeat[seatKey].push(item);
  });

  const seatKeys = Object.keys(itemsBySeat).sort((a, b) => {
    if (a === 'genel') return 1;
    if (b === 'genel') return -1;
    return Number(a) - Number(b);
  });

  if (items.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>Sepet bos</p>
        <p className="text-sm">Menudan urun ekleyin</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-800 text-sm">Masa {tableNumber} - Siparis</h3>
        <p className="text-xs text-gray-500">
          {items.length} kalem{total > 0 ? `, ${total.toFixed(2)} TL` : ' (Ucretsiz)'}
        </p>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3">
        {seatKeys.map(seatKey => {
          const seatItems = itemsBySeat[seatKey];
          const barItems = seatItems.filter(i => i.menuItem.destination === 'bar');
          const kitchenItems = seatItems.filter(i => i.menuItem.destination === 'kitchen');
          const seatTotal = seatItems.reduce((sum, item) => sum + ((item.menuItem.price || 0) * item.quantity), 0);

          return (
            <div key={seatKey} className="bg-white rounded-lg border p-2">
              {/* Sandalye Basligi */}
              <div className="flex items-center justify-between mb-2 pb-2 border-b">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    seatKey === 'genel' ? 'bg-gray-200 text-gray-600' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {seatKey === 'genel' ? <FiUser size={12} /> : seatKey}
                  </span>
                  <span className="text-xs font-medium text-gray-700">
                    {seatKey === 'genel' ? 'Genel' : `${seatKey}. Sandalye`}
                  </span>
                </div>
                <span className="text-xs font-semibold text-green-600">
                  {seatTotal > 0 ? `${seatTotal.toFixed(2)} TL` : 'Ucretsiz'}
                </span>
              </div>

              {/* Bar Urunleri */}
              {barItems.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs text-blue-600 mb-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    Bar
                  </div>
                  {barItems.map(item => (
                    <CartItem
                      key={item.id}
                      item={item}
                      onRemove={onRemove}
                      onUpdateQuantity={onUpdateQuantity}
                    />
                  ))}
                </div>
              )}

              {/* Mutfak Urunleri */}
              {kitchenItems.length > 0 && (
                <div>
                  <div className="text-xs text-orange-600 mb-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                    Mutfak
                  </div>
                  {kitchenItems.map(item => (
                    <CartItem
                      key={item.id}
                      item={item}
                      onRemove={onRemove}
                      onUpdateQuantity={onUpdateQuantity}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t bg-white">
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-600 text-sm">Toplam</span>
          <span className="text-xl font-bold text-gray-800">
            {total > 0 ? `${total.toFixed(2)} TL` : 'Ucretsiz'}
          </span>
        </div>
        <button
          onClick={onSubmit}
          className="w-full py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition"
        >
          Siparisi Gonder
        </button>
      </div>
    </div>
  );
}

function CartItem({
  item,
  onRemove,
  onUpdateQuantity
}: {
  item: OrderItem;
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
}) {
  return (
    <div className="bg-gray-50 rounded p-2 mb-1.5 text-sm">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-800 text-xs truncate">{item.menuItem.name}</h4>
          <p className="text-green-600 text-xs">
            {item.menuItem.price !== null ? `${item.menuItem.price.toFixed(2)} TL` : 'Ucretsiz'}
          </p>
          {item.notes && (
            <p className="text-xs text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded mt-1 truncate">
              {item.notes}
            </p>
          )}
        </div>
        <button
          onClick={() => onRemove(item.id)}
          className="p-1 text-red-500 hover:bg-red-50 rounded ml-1"
        >
          <FiTrash2 size={14} />
        </button>
      </div>

      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
            className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"
          >
            <FiMinus size={12} />
          </button>
          <span className="font-bold w-5 text-center text-xs text-gray-800">{item.quantity}</span>
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"
          >
            <FiPlus size={12} />
          </button>
        </div>
        <span className="font-semibold text-gray-700 text-xs">
          {item.menuItem.price !== null ? `${(item.menuItem.price * item.quantity).toFixed(2)} TL` : 'Ucretsiz'}
        </span>
      </div>
    </div>
  );
}
