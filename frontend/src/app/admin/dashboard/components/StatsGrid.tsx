import { Package, TrendingUp, Users, DollarSign } from 'lucide-react';
import type { Stats } from './types';

export function StatsGrid({ stats }: { stats: Stats }) {
  const items = [
    {
      label: 'Fotos subidas',
      value: stats.total_photos_uploaded,
      icon: <Users size={14} className="text-amber-400" />,
    },
    {
      label: 'Conversión',
      value: `${stats.conversion_rate_pct}%`,
      icon: <TrendingUp size={14} className="text-green-400" />,
    },
    {
      label: 'Total pedidos',
      value: stats.total_orders,
      icon: <Package size={14} className="text-blue-400" />,
    },
    {
      label: 'Pedidos pagados',
      value: stats.paid_orders,
      icon: <Package size={14} className="text-green-400" />,
    },
    {
      label: 'Ingresos (MXN)',
      value: `$${stats.total_revenue_mxn.toLocaleString()}`,
      icon: <DollarSign size={14} className="text-amber-400" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {items.map((stat) => (
        <div key={stat.label} className="bg-white/3 border border-white/10 rounded-2xl p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-white/40 text-[10px] sm:text-xs mb-1.5">
            {stat.icon}
            {stat.label}
          </div>
          <p className="font-bold text-lg sm:text-xl">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
