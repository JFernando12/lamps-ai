'use client';

import { Package, ExternalLink, Download } from 'lucide-react';
import clsx from 'clsx';

export function PreviewThumb({ url, size = 'sm' }: { url?: string; size?: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'w-20 h-20' : 'w-12 h-12';

  if (!url)
    return (
      <div className={clsx(dim, 'shrink-0 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center')}>
        <Package size={size === 'lg' ? 20 : 14} className="text-white/20" />
      </div>
    );

  return (
    <div className={clsx(dim, 'shrink-0 relative group')}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Preview" className="w-full h-full object-cover rounded-xl border border-white/10" />
      <div className="absolute inset-0 rounded-xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
        <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-white hover:text-amber-400" title="Ver imagen">
          <ExternalLink size={size === 'lg' ? 16 : 13} />
        </a>
        <a href={url} download onClick={(e) => e.stopPropagation()} className="text-white hover:text-amber-400" title="Descargar">
          <Download size={size === 'lg' ? 16 : 13} />
        </a>
      </div>
    </div>
  );
}
