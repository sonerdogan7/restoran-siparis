'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Category, MenuItem } from '@/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { FiPlus, FiMinus, FiChevronRight, FiEdit3, FiUser, FiPackage } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface MenuSelectorProps {
  onAddItem: (item: MenuItem, quantity: number, notes?: string, seatNumber?: number) => void;
  guestCount?: number;
}

export default function MenuSelector({ onAddItem, guestCount = 1 }: MenuSelectorProps) {
  const { currentBusiness } = useStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selectedSeats, setSelectedSeats] = useState<Record<string, number | undefined>>({});
  const [showNoteInput, setShowNoteInput] = useState<string | null>(null);

  // Firebase'den kategorileri dinle
  useEffect(() => {
    if (!currentBusiness) return;

    const categoriesRef = collection(db, 'businesses', currentBusiness.id, 'categories');
    const unsubscribe = onSnapshot(categoriesRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Category[];
      setCategories(data.sort((a, b) => (a.order || 0) - (b.order || 0)));
    });

    return () => unsubscribe();
  }, [currentBusiness]);

  // Firebase'den urunleri dinle
  useEffect(() => {
    if (!currentBusiness) return;

    const productsRef = collection(db, 'businesses', currentBusiness.id, 'products');
    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MenuItem[];
      // Sadece aktif urunleri goster
      setProducts(data.filter(p => p.isActive !== false));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentBusiness]);

  const category = categories.find(c => c.id === selectedCategory);

  // Secili alt kategorideki urunleri getir
  const getSubCategoryProducts = (subCategoryId: string) => {
    return products.filter(p =>
      p.category === selectedCategory &&
      p.subCategory === subCategoryId
    );
  };

  const getQuantity = (itemId: string) => quantities[itemId] || 0;
  const getNote = (itemId: string) => notes[itemId] || '';
  const getSelectedSeat = (itemId: string) => selectedSeats[itemId];

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

  const updateSeat = (itemId: string, seat: number | undefined) => {
    setSelectedSeats(prev => ({
      ...prev,
      [itemId]: seat
    }));
  };

  const handleAddItem = (item: MenuItem) => {
    const qty = getQuantity(item.id);
    const note = getNote(item.id);
    const seat = getSelectedSeat(item.id);
    if (qty > 0) {
      onAddItem(item, qty, note || undefined, seat);
      setQuantities(prev => ({ ...prev, [item.id]: 0 }));
      setNotes(prev => ({ ...prev, [item.id]: '' }));
      setSelectedSeats(prev => ({ ...prev, [item.id]: undefined }));
      setShowNoteInput(null);
      const seatText = seat ? ` (${seat}. sandalye)` : '';
      toast.success(`${qty}x ${item.name}${seatText} eklendi`);
    }
  };

  const quickNotes = [
    'Az pismis',
    'Orta pismis',
    'Cok pismis',
    'Acisiz',
    'Extra acili',
    'Sogansiz',
    'Buzlu',
    'Buzsuz',
    'Limonlu'
  ];

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-2"></div>
        <p className="text-gray-500">Menu yukleniyor...</p>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="p-4 text-center">
        <FiPackage size={48} className="mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500">Henuz menu eklenmemis</p>
        <p className="text-sm text-gray-400">Admin panelinden menu ekleyin</p>
      </div>
    );
  }

  // Category selection view
  if (!selectedCategory) {
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Menu</h3>
        <div className="space-y-3">
          {categories.map(cat => {
            const categoryProductCount = products.filter(p => p.category === cat.id).length;
            return (
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
                <div className="text-left">
                  <span className="text-lg font-semibold block">{cat.name}</span>
                  <span className="text-xs opacity-80">{categoryProductCount} urun</span>
                </div>
                <FiChevronRight size={24} />
              </button>
            );
          })}
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
          {category.subCategories?.map(sub => {
            const subProducts = products.filter(p => p.category === category.id && p.subCategory === sub.id);
            return (
              <button
                key={sub.id}
                onClick={() => setSelectedSubCategory(sub.id)}
                className="w-full p-4 bg-white rounded-xl flex items-center justify-between shadow hover:shadow-md transition"
              >
                <span className="font-medium text-gray-700">{sub.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">{subProducts.length} urun</span>
                  <FiChevronRight className="text-gray-400" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Items view
  const subCategoryProducts = selectedSubCategory ? getSubCategoryProducts(selectedSubCategory) : [];
  const subCategoryName = category?.subCategories?.find(s => s.id === selectedSubCategory)?.name || '';

  if (selectedSubCategory) {
    return (
      <div className="p-4 pb-24">
        <button
          onClick={() => setSelectedSubCategory(null)}
          className="text-blue-500 mb-4 flex items-center gap-1"
        >
          ← {category?.name}
        </button>
        <h3 className="text-lg font-semibold text-gray-700 mb-4">{subCategoryName}</h3>

        {subCategoryProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FiPackage size={32} className="mx-auto mb-2 opacity-50" />
            <p>Bu kategoride urun yok</p>
          </div>
        ) : (
          <div className="space-y-3">
            {subCategoryProducts.map(item => {
              const qty = getQuantity(item.id);
              const note = getNote(item.id);
              const selectedSeat = getSelectedSeat(item.id);
              const isNoteOpen = showNoteInput === item.id;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl p-4 shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-3">
                      {/* Urun Gorseli */}
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : null}
                      <div>
                        <h4 className="font-medium text-gray-800">{item.name}</h4>
                        <p className={`font-semibold ${item.price !== null ? 'text-green-600' : 'text-blue-600'}`}>
                          {item.price !== null ? `${item.price.toFixed(2)} TL` : 'Ucretsiz'}
                        </p>
                        {item.description && (
                          <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded flex-shrink-0 ${
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

                  {/* Sandalye Secimi */}
                  {qty > 0 && guestCount > 1 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                        <FiUser size={14} />
                        Sandalye sec:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => updateSeat(item.id, undefined)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                            selectedSeat === undefined
                              ? 'bg-gray-700 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          Genel
                        </button>
                        {Array.from({ length: guestCount }, (_, i) => i + 1).map(seatNum => (
                          <button
                            key={seatNum}
                            onClick={() => updateSeat(item.id, seatNum)}
                            className={`w-9 h-9 rounded-lg text-sm font-bold transition ${
                              selectedSeat === seatNum
                                ? 'bg-indigo-500 text-white'
                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                            }`}
                          >
                            {seatNum}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

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

                  {/* Secili sandalye gosterimi */}
                  {qty > 0 && selectedSeat && (
                    <div className="mt-2 text-xs text-indigo-700 bg-indigo-50 px-2 py-1 rounded flex items-center gap-1">
                      <FiUser size={12} />
                      {selectedSeat}. Sandalye
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
}
