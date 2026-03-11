'use client';

import { ExternalLink, Download, ImageOff, CheckCircle, Clock, XCircle } from 'lucide-react';

export function DesignPreview({
  designUrl,
  designStatus,
  designApproved,
  size = 'sm',
}: {
  designUrl?: string;
  designStatus?: string;
  designApproved?: boolean;
  size?: 'sm' | 'lg';
}) {
  const dim = size === 'lg' ? 'w-20 h-20' : 'w-12 h-12';

  if (!designUrl) {
    return (
      <div
        className={`${dim} rounded-xl bg-white/5 border border-white/10 flex items-center justify-center`}
      >
        <ImageOff size={size === 'lg' ? 20 : 14} className="text-white/20" />
      </div>
    );
  }

  const StatusIcon =
    designApproved
      ? CheckCircle
      : designStatus === 'failed'
        ? XCircle
        : designStatus === 'ready'
          ? CheckCircle
          : Clock;

  const statusColor =
    designApproved
      ? 'text-green-400'
      : designStatus === 'failed'
        ? 'text-red-400'
        : designStatus === 'ready'
          ? 'text-amber-400'
          : 'text-white/30';

  return (
    <div className="flex flex-col gap-1">
      <div className={`relative ${dim} rounded-xl overflow-hidden border border-white/10 group`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={designUrl} alt="Diseño" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <a
            href={designUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ExternalLink size={12} />
          </a>
          <a
            href={designUrl}
            download
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Download size={12} />
          </a>
        </div>
      </div>
      <div className={`flex items-center gap-1 text-[10px] ${statusColor}`}>
        <StatusIcon size={10} />
        <span>{designApproved ? 'Aprobado' : designStatus ?? '—'}</span>
      </div>
    </div>
  );
}
