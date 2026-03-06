'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { STATUSES, STATUS_LABELS } from './types';

export function StatusDropdown({
  current,
  disabled,
  onChange,
}: {
  current: string;
  disabled: boolean;
  onChange: (status: string, tracking?: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
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
        <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl py-1 z-20 min-w-40 shadow-2xl">
          {STATUSES.filter((s) => s !== current).map((s) => (
            <button
              key={s}
              onClick={async () => {
                setOpen(false);
                let tracking: string | undefined;
                if (s === 'shipped') {
                  tracking = window.prompt('Número de rastreo (opcional):') ?? undefined;
                }
                onChange(s, tracking);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors"
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
