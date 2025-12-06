'use client';

import { OrderItem } from '@/types';
import { FiTrash2, FiMinus, FiPlus } from 'react-icons/fi';

interface CartProps {
  items: OrderItem[];
  onRemove: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onSubmit: () => void;
  tableNumber: number;
}

export default function Cart({ items, onRemove, onUpdateQuantity, onSubmit, tableNumber }: CartProps) {
  const total = items.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);

  const barItems = items.filter(i => i.menuItem.destination === 'bar');
  const kitchenItems = items.filter(i => i.menuItem.destination === 'kitchen');

  if (items.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>Sepet boş</p>
        <p className="text-sm">Menüden ürün ekleyin</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-800">Masa {tableNumber} - Sipariş</h3>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {barItems.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-blue-600 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              BAR ({barItems.length})
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

        {kitchenItems.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-orange-600 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              MUTFAK ({kitchenItems.length})
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

      <div className="p-4 border-t bg-white">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-600">Toplam</span>
          <span className="text-2xl font-bold text-gray-800">{total} ₺</span>
        </div>
        <button
          onClick={onSubmit}
          className="w-full py-4 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition text-lg"
        >
          Siparişi Gönder
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
    <div className="bg-white rounded-lg p-3 shadow-sm mb-2 border">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-medium text-gray-800 text-sm">{item.menuItem.name}</h4>
          <p className="text-green-600 text-sm">{item.menuItem.price} ₺</p>
        </div>
        <button
          onClick={() => onRemove(item.id)}
          className="p-1 text-red-500 hover:bg-red-50 rounded"
        >
          <FiTrash2 size={16} />
        </button>
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <FiMinus size={14} />
          </button>
          <span className="font-bold w-6 text-center">{item.quantity}</span>
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <FiPlus size={14} />
          </button>
        </div>
        <span className="font-semibold text-gray-700">
          {item.menuItem.price * item.quantity} ₺
        </span>
      </div>
    </div>
  );
}
