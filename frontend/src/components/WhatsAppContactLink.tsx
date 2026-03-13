'use client';

import { useConfig, waHref } from '@/contexts/ConfigContext';

interface Props {
  className?: string;
  children?: React.ReactNode;
}

/** Inline WhatsApp link that reads the number from ConfigContext.
 *  Use this inside server component pages (terminos, privacidad, etc.) */
export function WhatsAppContactLink({ className, children }: Props) {
  const { whatsapp_number } = useConfig();
  return (
    <a
      href={waHref(whatsapp_number)}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children ?? `+${whatsapp_number}`}
    </a>
  );
}
