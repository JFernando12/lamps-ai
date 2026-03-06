"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Upload, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import clsx from 'clsx';

interface PreviewResult {
  preview_id: string;
  render_url: string;
}

const AI_STAGES = [
  { pct: 5, label: 'Subiendo tu foto…' },
  { pct: 22, label: 'Procesando imagen…' },
  { pct: 42, label: 'Creando tu diseño personalizado…' },
  { pct: 68, label: 'Aplicando acabado de lámpara…' },
  { pct: 85, label: 'Añadiendo detalles finales…' },
  { pct: 93, label: 'Casi listo…' },
] as const;

export default function PreviewGenerator() {
  const { user } = useAuth();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const stageTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Advance through timed stages while uploading
  useEffect(() => {
    if (!uploading) {
      stageTimers.current.forEach(clearTimeout);
      stageTimers.current = [];
      return;
    }
    setStageIdx(0);
    setProgress(AI_STAGES[0].pct);
    const delays = [0, 2000, 5000, 9000, 14000, 19000];
    delays.forEach((ms, i) => {
      const t = setTimeout(() => {
        setStageIdx(i);
        setProgress(AI_STAGES[i].pct);
      }, ms);
      stageTimers.current.push(t);
    });
    return () => {
      stageTimers.current.forEach(clearTimeout);
      stageTimers.current = [];
    };
  }, [uploading]);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Por favor sube una imagen (JPG, PNG, WEBP).');
      return;
    }
    setError(null);
    setPreview(null);
    const reader = new FileReader();
    reader.onload = (e) => setLocalPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    (window as { fbq?: (...args: unknown[]) => void }).fbq?.(
      'trackCustom',
      'PhotoUploaded',
    );
    try {
      const result = await api.uploadPreview(file);
      setProgress(100);
      // Brief pause so the user sees 100% before the result appears
      await new Promise((r) => setTimeout(r, 400));
      setPreview(result);
      (window as { fbq?: (...args: unknown[]) => void }).fbq?.(
        'track',
        'ViewContent',
        {
          content_name: 'Lamp Preview',
          value: 598,
          currency: 'MXN',
        },
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error generando preview');
    } finally {
      setUploading(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <section id="preview" className="py-12 md:py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Ve cómo queda con <span className="text-amber-400">tu foto</span>
          </h2>
          <p className="text-white/50 text-base md:text-lg">
            Gratis, sin registrarte. Sube una foto y ve el resultado en segundos
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Upload zone */}
          <div>
            {/* Hidden file inputs — one for gallery, one for camera */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />
            <input
              id="camera-input"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onFileChange}
            />

            {/* Drop zone (desktop) / tap zone (mobile) */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={clsx(
                'relative border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all flex flex-col items-center justify-center min-h-56 text-center touch-manipulation',
                dragging
                  ? 'border-amber-400 bg-amber-400/5'
                  : 'border-white/20 hover:border-amber-400/50 active:border-amber-400/50 hover:bg-white/2',
              )}
            >
              {localPreview ? (
                <Image
                  src={localPreview}
                  alt="Tu foto"
                  width={300}
                  height={300}
                  className="max-h-56 object-contain rounded-xl"
                />
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                    <Upload size={28} className="text-amber-400" />
                  </div>
                  <p className="font-semibold text-lg mb-1">
                    <span className="hidden md:inline">
                      Arrastra tu foto aquí
                    </span>
                    <span className="md:hidden">Toca para elegir tu foto</span>
                  </p>
                  <p className="text-white/40 text-sm hidden md:block">
                    o haz clic para buscarla
                  </p>
                  <p className="text-white/25 text-xs mt-3">
                    JPG, PNG, WEBP · Máx 10 MB
                  </p>
                </>
              )}

              {uploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-2xl gap-4 px-8">
                  {/* Stage label */}
                  <p className="text-amber-400 text-sm font-medium tracking-wide">
                    {AI_STAGES[stageIdx].label}
                  </p>
                  {/* Progress bar */}
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-white/30 text-xs">{progress}%</p>
                </div>
              )}
            </div>

            {/* Mobile: explicit camera button */}
            {!localPreview && !uploading && (
              <button
                onClick={() => document.getElementById('camera-input')?.click()}
                className="md:hidden mt-3 w-full flex items-center justify-center gap-2 border border-white/10 hover:border-amber-400/30 active:border-amber-400/50 text-white/60 py-3 rounded-xl text-sm transition-colors touch-manipulation"
              >
                📷 Abrir cámara
              </button>
            )}

            {error && (
              <p className="mt-3 text-red-400 text-sm text-center">{error}</p>
            )}

            {!preview && !uploading && (
              <p className="text-center text-white/30 text-xs mt-4">
                Tu foto se procesa de forma segura y no se comparte con nadie
              </p>
            )}
          </div>

          {/* Result */}
          <div>
            {preview ? (
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden border border-amber-400/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview.render_url}
                    alt="Tu lámpara generada"
                    className="w-full object-cover"
                  />
                </div>

                <p className="text-xs text-white/40 text-center px-2">
                  ✦ Imagen de referencia — los trazos finales son realizados a
                  mano, siendo fieles a tu foto.
                </p>

                <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                  <CheckCircle2
                    size={20}
                    className="text-green-400 shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="font-semibold text-green-300 text-sm">
                      ¡Tu preview está listo!
                    </p>
                    <p className="text-white/50 text-sm mt-0.5">
                      Este diseño se graba con láser en acrílico de 5mm.
                      Disponible en 5–7 días.
                    </p>
                  </div>
                </div>

                {!user?.is_admin && (
                  <Link
                    href={`/checkout?product=rgb&preview_id=${preview.preview_id}`}
                    className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-4 rounded-2xl text-lg transition-all hover:scale-[1.02]"
                  >
                    Pedir esta lámpara — $598 MXN
                    <ArrowRight size={20} />
                  </Link>
                )}

                <button
                  onClick={() => {
                    setPreview(null);
                    setLocalPreview(null);
                    setError(null);
                  }}
                  className="w-full text-center text-white/40 hover:text-white/70 text-sm py-2 transition-colors"
                >
                  Probar otra foto
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/2 overflow-hidden">
                <div className="grid grid-cols-2 divide-x divide-white/10">
                  <div className="relative aspect-square">
                    <Image
                      src="/gallery/lampara-3-v2.jpg"
                      alt="Foto original ejemplo"
                      fill
                      className="object-cover"
                      sizes="200px"
                    />
                    <span className="absolute bottom-2 left-2 text-xs bg-black/60 px-2 py-0.5 rounded-full text-white/70">
                      Tu foto
                    </span>
                  </div>
                  <div className="relative aspect-square">
                    <Image
                      src="/gallery/lampara-4-v2.jpg"
                      alt="Resultado en lámpara ejemplo"
                      fill
                      className="object-cover"
                      sizes="200px"
                    />
                    <span className="absolute bottom-2 left-2 text-xs bg-black/60 px-2 py-0.5 rounded-full text-amber-400">
                      Tu lámpara
                    </span>
                  </div>
                </div>
                <div className="p-4 text-center text-white/30 text-sm">
                  Sube tu foto y ve cómo quedaría ↑
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
