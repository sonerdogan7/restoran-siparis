'use client';

import { Order, OrderItem } from '@/types';
import { useRef } from 'react';
import { FiPrinter } from 'react-icons/fi';

interface OrderTicketProps {
  order: Order;
  destination: 'bar' | 'kitchen';
  onPrint?: () => void;
}

export default function OrderTicket({ order, destination, onPrint }: OrderTicketProps) {
  const ticketRef = useRef<HTMLDivElement>(null);

  const items = order.items.filter(item => item.menuItem.destination === destination);

  if (items.length === 0) return null;

  const handlePrint = () => {
    if (ticketRef.current) {
      const printContent = ticketRef.current.innerHTML;
      const printWindow = window.open('', '', 'width=300,height=600');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Sipariş Fişi</title>
              <style>
                body {
                  font-family: 'Courier New', monospace;
                  padding: 10px;
                  max-width: 280px;
                  margin: 0 auto;
                }
                .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                .title { font-size: 18px; font-weight: bold; }
                .info { font-size: 12px; margin: 5px 0; }
                .items { margin: 15px 0; }
                .item { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
                .item-name { flex: 1; }
                .item-qty { font-weight: bold; margin-right: 10px; }
                .divider { border-top: 1px dashed #000; margin: 10px 0; }
                .footer { text-align: center; font-size: 10px; margin-top: 15px; }
                @media print {
                  body { padding: 0; }
                }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
      }
    }
    onPrint?.();
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div ref={ticketRef} className="p-4">
        <div className="header">
          <div className="title">
            {destination === 'bar' ? '🍺 BAR' : '🍳 MUTFAK'}
          </div>
          <div className="info">Masa: {order.tableNumber}</div>
          <div className="info">Garson: {order.waiter}</div>
          <div className="info">Saat: {formatTime(order.createdAt)}</div>
        </div>

        <div className="items">
          {items.map((item, index) => (
            <div key={item.id} className="item">
              <span className="item-qty">{item.quantity}x</span>
              <span className="item-name">{item.menuItem.name}</span>
            </div>
          ))}
        </div>

        <div className="divider"></div>
        <div className="footer">
          Sipariş #{order.id.slice(-6).toUpperCase()}
        </div>
      </div>

      <button
        onClick={handlePrint}
        className="w-full py-3 bg-gray-800 text-white flex items-center justify-center gap-2 hover:bg-gray-700 transition"
      >
        <FiPrinter />
        Fiş Yazdır
      </button>
    </div>
  );
}
