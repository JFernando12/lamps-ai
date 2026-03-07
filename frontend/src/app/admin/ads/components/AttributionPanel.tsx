import { TrendingUp, DollarSign, Package, Zap } from 'lucide-react';
import type { AdsAttribution } from './types';

interface Props {
  data: AdsAttribution;
}

function CvrBadge({ cvr }: { cvr: number }) {
  const color =
    cvr >= 20 ? 'text-green-400' : cvr >= 10 ? 'text-amber-400' : 'text-red-400';
  return <span className={`font-semibold ${color}`}>{cvr}%</span>;
}

export function AttributionPanel({ data }: Props) {
  const { summary, funnel_by_source, by_campaign } = data;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-white/40 text-xs mb-1.5">
            <Package size={13} className="text-amber-400" />
            Pedidos atribuidos
          </div>
          <p className="font-bold text-xl">{summary.total_attributed_orders}</p>
        </div>
        <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-white/40 text-xs mb-1.5">
            <DollarSign size={13} className="text-green-400" />
            Revenue atribuido
          </div>
          <p className="font-bold text-xl">
            ${summary.total_attributed_revenue.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
            <span className="text-white/30 font-normal text-sm ml-1">MXN</span>
          </p>
        </div>
        <div className="bg-white/3 border border-white/10 rounded-2xl p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-1.5 text-white/40 text-xs mb-1.5">
            <Zap size={13} className="text-blue-400" />
            Checkouts (con UTM)
          </div>
          <p className="font-bold text-xl">{summary.total_initiated}</p>
        </div>
      </div>

      {/* Funnel by source */}
      <div className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <TrendingUp size={14} className="text-amber-400" />
            Funnel por fuente
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-120">
            <thead>
              <tr className="border-b border-white/8">
                <th className="text-left text-white/40 font-medium text-xs px-5 py-3">Fuente</th>
                <th className="text-right text-white/40 font-medium text-xs px-4 py-3">Checkouts</th>
                <th className="text-right text-white/40 font-medium text-xs px-4 py-3">Pagados</th>
                <th className="text-right text-white/40 font-medium text-xs px-4 py-3">CVR</th>
                <th className="text-right text-white/40 font-medium text-xs px-5 py-3">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {funnel_by_source.map((row) => (
                <tr
                  key={row.source}
                  className="border-b border-white/5 hover:bg-white/2 transition-colors"
                >
                  <td className="px-5 py-3 font-medium text-white/80">{row.source}</td>
                  <td className="px-4 py-3 text-right text-white/50">{row.initiated}</td>
                  <td className="px-4 py-3 text-right text-green-400 font-semibold">{row.paid}</td>
                  <td className="px-4 py-3 text-right">
                    <CvrBadge cvr={row.cvr_pct} />
                  </td>
                  <td className="px-5 py-3 text-right text-amber-400 font-semibold">
                    ${row.revenue.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
              {funnel_by_source.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-white/30 text-sm">
                    Aún no hay pedidos con datos UTM.
                    <br />
                    <span className="text-xs">
                      Los datos aparecerán aquí cuando los primeros pedidos lleguen a través de un enlace con UTM.
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* By campaign */}
      {by_campaign.length > 0 && (
        <div className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Package size={14} className="text-blue-400" />
              Por campaña
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-130">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="text-left text-white/40 font-medium text-xs px-5 py-3">
                    Fuente / Campaña
                  </th>
                  <th className="text-right text-white/40 font-medium text-xs px-4 py-3">Checkouts</th>
                  <th className="text-right text-white/40 font-medium text-xs px-4 py-3">Pagados</th>
                  <th className="text-right text-white/40 font-medium text-xs px-4 py-3">CVR</th>
                  <th className="text-right text-white/40 font-medium text-xs px-5 py-3">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {by_campaign.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-white/5 hover:bg-white/2 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-white/70 text-xs">{row.utm_source}</p>
                      <p className="text-white/40 text-xs">{row.utm_campaign}</p>
                      {row.utm_content && (
                        <p className="text-white/25 text-[10px]">{row.utm_content}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-white/50">{row.initiated}</td>
                    <td className="px-4 py-3 text-right text-green-400 font-semibold">{row.paid}</td>
                    <td className="px-4 py-3 text-right">
                      <CvrBadge cvr={row.cvr_pct} />
                    </td>
                    <td className="px-5 py-3 text-right text-amber-400 font-semibold">
                      ${row.revenue.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
