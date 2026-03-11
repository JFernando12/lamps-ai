'use client';

import { Search } from 'lucide-react';
import { STATUSES, STATUS_LABELS } from './types';

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
    <div className="flex flex-col sm:flex-row gap-3 mb-5">
      <div className="relative flex-1">
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
      <select
        value={filterType}
        onChange={(e) => onFilterType(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/40"
      >
        <option value="all">Todos los canales</option>
        <option value="whatsapp">WhatsApp</option>
        <option value="checkout">Checkout</option>
      </select>
      <select
        value={filterStatus}
        onChange={(e) => onFilterStatus(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/40"
      >
        <option value="all">Todos los estados</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );
}
