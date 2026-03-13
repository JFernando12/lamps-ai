'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface SiteConfig {
  whatsapp_number: string;
  whatsapp_message: string;
}

const DEFAULTS: SiteConfig = {
  whatsapp_number: '527551008874',
  whatsapp_message: 'Hola, me das información de las lámparas personalizadas',
};

const ConfigContext = createContext<SiteConfig>(DEFAULTS);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(DEFAULTS);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
    fetch(`${base}/api/config`)
      .then((r) => r.json())
      .then((data: Partial<SiteConfig>) => setConfig({ ...DEFAULTS, ...data }))
      .catch(() => {});
  }, []);

  return (
    <ConfigContext.Provider value={config}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}

export function waHref(number: string, message?: string): string {
  const base = `https://wa.me/${number}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}
