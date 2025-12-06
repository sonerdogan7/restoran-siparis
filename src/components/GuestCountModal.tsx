'use client';

import { useState } from 'react';
import { FiMinus, FiPlus, FiX } from 'react-icons/fi';

interface GuestCountModalProps {
  tableNumber: number;
  onConfirm: (count: number) => void;
  onClose: () => void;
}

export default function GuestCountModal({ tableNumber, onConfirm, onClose }: GuestCountModalProps) {
  const [count, setCount] = useState(1);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Masa {tableNumber}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <FiX size={24} />
          </button>
        </div>

        <p className="text-gray-600 mb-4 text-center">Kaç kişi oturacak?</p>

        <div className="flex items-center justify-center gap-6 mb-6">
          <button
            onClick={() => setCount(Math.max(1, count - 1))}
            className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-300 transition"
          >
            <FiMinus size={24} />
          </button>

          <span className="text-5xl font-bold text-gray-800 w-20 text-center">{count}</span>

          <button
            onClick={() => setCount(count + 1)}
            className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-300 transition"
          >
            <FiPlus size={24} />
          </button>
        </div>

        <button
          onClick={() => onConfirm(count)}
          className="w-full py-4 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition"
        >
          Masayı Aç
        </button>
      </div>
    </div>
  );
}
