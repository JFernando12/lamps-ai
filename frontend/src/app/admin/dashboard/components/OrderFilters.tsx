'use client';

import { Search, ChevronDown } from 'lucide-react';
import { STATUSES, STATUS_LABELS } from './types';

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-[#1a1a1a] border border-white/10 rounded-xl pl-4 pr-9 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/40"
      >
        {children}
      </select>
      <ChevronDown
        size={13}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
      />
    </div>
  );
}

export function OrderFilters({
  search,
  onSearch,
  filterStatus,
  onFilterStatus,
  filterType,
  onFilterType,
}: {
  search: string;
  onSearch: (v: string) => void;
  filterStatus: string;
  onFilterStatus: (v: string) => void;
  filterType: string;
  onFilterType: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 mb-5">
      {/* Search — full width always */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
        />
        <input
          type="text"
          placeholder="Buscar por email, teléfono, nombre o ID…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-amber-500/40"
        />
      </div>
      {/* Selects — side by side on mobile too */}
      <div className="grid grid-cols-2 gap-2">
        <Select value={filterType} onChange={onFilterType}>
          <option value="all">Todos los canales</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="checkout">Checkout</option>
        </Select>
        <Select value={filterStatus} onChange={onFilterStatus}>
          <option value="all">Todos los estados</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
