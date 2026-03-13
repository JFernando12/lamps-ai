'use client';

import { getEvent } from '@/lib/pixelEvents';
import { useConfig, waHref } from '@/contexts/ConfigContext';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';

export function WhatsAppButton() {
  const { whatsapp_number, whatsapp_message } = useConfig();

  const handleClick = () => {
    getEvent('Contact').track();
  };

  return (
    <a
      href={waHref(whatsapp_number, whatsapp_message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="fixed bottom-3 right-4 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold pl-4 pr-5 py-3 rounded-full shadow-lg shadow-black/40 transition-all hover:scale-105 touch-manipulation"
      aria-label="Contactar por WhatsApp"
    >
      <WhatsAppIcon size={22} />
      <span className="text-sm whitespace-nowrap">¿Dudas? Escríbenos</span>
    </a>
  );
}
