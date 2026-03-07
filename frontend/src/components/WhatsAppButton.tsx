'use client';

import { MessageCircle } from 'lucide-react';
import { getEvent } from '@/lib/pixelEvents';

export function WhatsAppButton() {
  const handleClick = () => {
    getEvent('Contact').track();
  };

  return (
    <a
      href="https://wa.me/527551155510"
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="fixed bottom-6 right-4 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold pl-4 pr-5 py-3 rounded-full shadow-lg shadow-black/40 transition-all hover:scale-105 touch-manipulation"
      aria-label="Contactar por WhatsApp"
    >
      <MessageCircle size={22} />
      <span className="text-sm whitespace-nowrap">¿Dudas? Escríbenos</span>
    </a>
  );
}
