'use client';

import { useState } from 'react';
import { menuData } from '@/lib/menuData';
import { MenuItem } from '@/types';
import { FiPlus, FiMinus, FiChevronRight, FiEdit3 } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface MenuSelectorProps {
  onAddItem: (item: MenuItem, quantity: number, notes?: string) => void;
}

export default function MenuSelector({ onAddItem }: MenuSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showNoteInput, setShowNoteInput] = useState<string | null>(null);

  const category = menuData.find(c => c.id === selectedCategory);
  const subCategory = category?.subCategories.find(s => s.id === selectedSubCategory);

  const getQuantity = (itemId: string) => quantities[itemId] || 0;
  const getNote = (itemId: string) => notes[itemId] || '';

  const updateQuantity = (itemId: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] || 0) + delta)
    }));
  };

  const updateNote = (itemId: string, note: string) => {
    setNotes(prev => ({
      ...prev,
      [itemId]: note
    }));
  };

  const handleAddItem = (item: MenuItem) => {
    const qty = getQuantity(item.id);
    const note = getNote(item.id);
    if (qty > 0) {
      onAddItem(item, qty, note || undefined);
      setQuantities(prev => ({ ...prev, [item.id]: 0 }));
      setNotes(prev => ({ ...prev, [item.id]: '' }));
      setShowNoteInput(null);
      toast.success(`${qty}x ${item.name} eklendi`);
    }
  };

  const quickNotes = [
    'Az pismiş',
    'Orta pismiş',
    'Cok pismiş',
    'Acisiz',
    'Extra acili',
    'Sogansiz',
    'Buzlu',
    'Buzsuz',
    'Limonlu'
  ];

  // Category selection view
  if (!selectedCategory) {
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Menu</h3>
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
                <span className="text-sm text-gray-400">{sub.items.length} urun</span>
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
            const note = getNote(item.id);
            const isNoteOpen = showNoteInput === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl p-4 shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-800">{item.name}</h4>
                    <p className="text-green-600 font-semibold">{item.price} TL</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    item.destination === 'bar'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {item.destination === 'bar' ? 'Bar' : 'Mutfak'}
                  </span>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-all"
                      disabled={qty === 0}
                    >
                      <FiMinus size={18} />
                    </button>
                    <span className={`text-2xl font-bold w-10 text-center ${qty > 0 ? 'text-green-600' : 'text-gray-400'}`}>{qty}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-md transition-all"
                    >
                      <FiPlus size={18} />
                    </button>
                  </div>

                  {qty > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowNoteInput(isNoteOpen ? null : item.id)}
                        className={`p-2 rounded-lg ${note ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}
                        title="Not ekle"
                      >
                        <FiEdit3 size={18} />
                      </button>
                      <button
                        onClick={() => handleAddItem(item)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition"
                      >
                        Ekle
                      </button>
                    </div>
                  )}
                </div>

                {/* Not girisi */}
                {qty > 0 && isNoteOpen && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-gray-600 mb-2">Not ekle:</p>

                    {/* Hizli notlar */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {quickNotes.map(qNote => (
                        <button
                          key={qNote}
                          onClick={() => updateNote(item.id, note ? `${note}, ${qNote}` : qNote)}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                        >
                          {qNote}
                        </button>
                      ))}
                    </div>

                    {/* Manuel not girisi */}
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => updateNote(item.id, e.target.value)}
                      placeholder="Ozel not yazin..."
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />

                    {note && (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-500">Not: {note}</span>
                        <button
                          onClick={() => updateNote(item.id, '')}
                          className="text-xs text-red-500"
                        >
                          Temizle
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Not gosterimi (kapali durumda) */}
                {qty > 0 && !isNoteOpen && note && (
                  <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                    Not: {note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
