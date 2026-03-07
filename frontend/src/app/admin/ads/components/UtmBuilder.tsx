'use client';

import { useState, useMemo } from 'react';
import { Link2, Copy, CheckCircle2 } from 'lucide-react';

const SOURCES = ['facebook', 'instagram', 'google', 'tiktok', 'email', 'otro'];
const MEDIUMS = ['cpc', 'social', 'email', 'organic', 'referral'];

export function UtmBuilder() {
  const [baseUrl, setBaseUrl] = useState('https://thedreamgiftmx.com');
  const [source, setSource] = useState('facebook');
  const [medium, setMedium] = useState('cpc');
  const [campaign, setCampaign] = useState('');
  const [content, setContent] = useState('');
  const [copied, setCopied] = useState(false);

  const builtUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (source) params.set('utm_source', source);
    if (medium) params.set('utm_medium', medium);
    if (campaign.trim())
      params.set('utm_campaign', campaign.trim().toLowerCase().replace(/\s+/g, '_'));
    if (content.trim())
      params.set('utm_content', content.trim().toLowerCase().replace(/\s+/g, '_'));
    const qs = params.toString();
    return `${baseUrl}${qs ? '?' + qs : ''}`;
  }, [baseUrl, source, medium, campaign, content]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(builtUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 transition-colors';

  return (
    <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
      <h3 className="font-semibold text-sm text-white/80 mb-4 flex items-center gap-2">
        <Link2 size={14} className="text-amber-400" />
        Constructor de URLs UTM
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="sm:col-span-2">
          <label className="block text-xs text-white/40 mb-1">URL base</label>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className={inputClass}
            placeholder="https://thedreamgiftmx.com"
          />
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1">Fuente (utm_source)</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className={`${inputClass} appearance-none cursor-pointer`}
          >
            {SOURCES.map((s) => (
              <option key={s} value={s} className="bg-[#1a1a1a]">
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1">Medio (utm_medium)</label>
          <select
            value={medium}
            onChange={(e) => setMedium(e.target.value)}
            className={`${inputClass} appearance-none cursor-pointer`}
          >
            {MEDIUMS.map((m) => (
              <option key={m} value={m} className="bg-[#1a1a1a]">
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1">Campaña (utm_campaign)</label>
          <input
            type="text"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="retargeting_rgb"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1">
            Contenido (utm_content){' '}
            <span className="text-white/25">— opcional</span>
          </label>
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="video_v1"
            className={inputClass}
          />
        </div>
      </div>

      <label className="block text-xs text-white/40 mb-1.5">URL generada</label>
      <div className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 flex items-start gap-3">
        <code className="text-amber-300 text-xs flex-1 break-all leading-relaxed">{builtUrl}</code>
        <button
          onClick={copy}
          className="shrink-0 mt-0.5 text-white/40 hover:text-white transition-colors"
          title="Copiar URL"
        >
          {copied ? (
            <CheckCircle2 size={15} className="text-green-400" />
          ) : (
            <Copy size={15} />
          )}
        </button>
      </div>
    </div>
  );
}
