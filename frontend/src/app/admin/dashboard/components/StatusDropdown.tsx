'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Truck } from 'lucide-react';
import { CHECKOUT_STATUSES, WHATSAPP_STATUSES, STATUS_LABELS } from './types';

export function StatusDropdown({
  current,
  orderType,
  disabled,
  onChange,
}: {
  current: string;
  orderType: 'checkout' | 'whatsapp';
  disabled: boolean;
  onChange: (status: string, tracking?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [trackingMode, setTrackingMode] = useState(false);
  const [trackingInput, setTrackingInput] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const statuses =
    orderType === 'whatsapp' ? WHATSAPP_STATUSES : CHECKOUT_STATUSES;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setTrackingMode(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  const handleSelect = (s: string) => {
    if (s === 'shipped') {
      setTrackingMode(true);
    } else {
      setOpen(false);
      onChange(s);
    }
  };

  const confirmShipped = () => {
    setOpen(false);
    setTrackingMode(false);
    onChange('shipped', trackingInput.trim() || undefined);
    setTrackingInput('');
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen(!open);
          setTrackingMode(false);
        }}
        disabled={disabled}
        className="flex items-center gap-1.5 border border-white/10 hover:border-amber-400/30 px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50"
      >
        {disabled ? (
          <div className="w-3 h-3 border border-white/40 border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            Cambiar estado
            <ChevronDown size={12} />
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl py-1 z-20 min-w-48 shadow-2xl">
          {!trackingMode ? (
            statuses
              .filter((s) => s !== current)
              .map((s) => (
                <button
                  key={s}
                  onClick={() => handleSelect(s)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors"
                >
                  {STATUS_LABELS[s]}
                </button>
              ))
          ) : (
            <div className="px-3 py-2.5 flex flex-col gap-2">
              <p className="text-xs text-white/50 flex items-center gap-1.5">
                <Truck size={11} className="text-blue-400" />
                Número de rastreo
              </p>
              <input
                autoFocus
                type="text"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmShipped()}
                placeholder="Ej: 1Z999AA1... (opcional)"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 w-full"
              />
              <div className="flex gap-2">
                <button
                  onClick={confirmShipped}
                  className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 text-xs py-1.5 rounded-lg transition-colors"
                >
                  Confirmar envío
                </button>
                <button
                  onClick={() => setTrackingMode(false)}
                  className="px-3 text-white/30 hover:text-white/60 text-xs py-1.5 transition-colors"
                >
                  ← Volver
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
