'use client';

import { useState } from 'react';
import { menuData } from '@/lib/menuData';
import { MenuItem } from '@/types';
import { useStore } from '@/store/useStore';
import { FiPlus, FiMinus, FiChevronRight } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface MenuSelectorProps {
  onAddItem: (item: MenuItem, quantity: number, notes?: string) => void;
}

export default function MenuSelector({ onAddItem }: MenuSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const category = menuData.find(c => c.id === selectedCategory);
  const subCategory = category?.subCategories.find(s => s.id === selectedSubCategory);

  const getQuantity = (itemId: string) => quantities[itemId] || 0;

  const updateQuantity = (itemId: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] || 0) + delta)
    }));
  };

  const handleAddItem = (item: MenuItem) => {
    const qty = getQuantity(item.id);
    if (qty > 0) {
      onAddItem(item, qty);
      setQuantities(prev => ({ ...prev, [item.id]: 0 }));
      toast.success(`${qty}x ${item.name} eklendi`);
    }
  };

  // Category selection view
  if (!selectedCategory) {
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Menü</h3>
        <div className="space-y-3">
          {menuData.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`
                w-full p-4 rounded-xl flex items-center justify-between
                transition-all duration-200 shadow
                ${cat.type === 'drink'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                  : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                }
              `}
            >
              <span className="text-lg font-semibold">{cat.name}</span>
              <FiChevronRight size={24} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Subcategory selection view
  if (!selectedSubCategory && category) {
    return (
      <div className="p-4">
        <button
          onClick={() => setSelectedCategory(null)}
          className="text-blue-500 mb-4 flex items-center gap-1"
        >
          ← Geri
        </button>
        <h3 className="text-lg font-semibold text-gray-700 mb-4">{category.name}</h3>
        <div className="space-y-2">
          {category.subCategories.map(sub => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubCategory(sub.id)}
              className="w-full p-4 bg-white rounded-xl flex items-center justify-between shadow hover:shadow-md transition"
            >
              <span className="font-medium text-gray-700">{sub.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">{sub.items.length} ürün</span>
                <FiChevronRight className="text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Items view
  if (subCategory) {
    return (
      <div className="p-4">
        <button
          onClick={() => setSelectedSubCategory(null)}
          className="text-blue-500 mb-4 flex items-center gap-1"
        >
          ← {category?.name}
        </button>
        <h3 className="text-lg font-semibold text-gray-700 mb-4">{subCategory.name}</h3>
        <div className="space-y-3">
          {subCategory.items.map(item => {
            const qty = getQuantity(item.id);
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl p-4 shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-800">{item.name}</h4>
                    <p className="text-green-600 font-semibold">{item.price} ₺</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    item.destination === 'bar'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {item.destination === 'bar' ? 'Bar' : 'Mutfak'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"
                      disabled={qty === 0}
                    >
                      <FiMinus />
                    </button>
                    <span className="text-xl font-bold w-8 text-center">{qty}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"
                    >
                      <FiPlus />
                    </button>
                  </div>

                  {qty > 0 && (
                    <button
                      onClick={() => handleAddItem(item)}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition"
                    >
                      Ekle
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
