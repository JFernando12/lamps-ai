'use client';

import { useRef, useCallback, useState } from 'react';
import { Upload, Type, Music, CheckCircle2, Trash2, Minus, Plus } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { getEvent } from '@/lib/pixelEvents';
import { CartItemState, ProductId, PRODUCTS } from './types';

interface Props {
  item: CartItemState;
  itemIndex: number;
  canRemove: boolean;
  onProductChange: (localId: string, productId: ProductId) => void;
  onQuantityChange: (localId: string, quantity: number) => void;
  onPhotoUploaded: (localId: string, photoId: string) => void;
  onPreviewChange: (localId: string, preview: string | null) => void;
  onEngravingChange: (localId: string, text: string) => void;
  onSpotifyChange: (localId: string, url: string) => void;
  onRemove: (localId: string) => void;
}

export function LampItemForm({
  item,
  itemIndex: _itemIndex,
  canRemove,
  onProductChange,
  onQuantityChange,
  onPhotoUploaded,
  onPreviewChange,
  onEngravingChange,
  onSpotifyChange,
  onRemove,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setUploadError('Por favor sube una imagen (JPG, PNG, WEBP).');
        return;
      }
      setUploadError(null);
      const reader = new FileReader();
      reader.onload = (e) =>
        onPreviewChange(item.localId, e.target?.result as string);
      reader.readAsDataURL(file);
      setUploading(true);
      try {
        const result = await api.uploadPhoto(file);
        onPhotoUploaded(item.localId, result.photo_id);
        getEvent('PhotoUploaded').track();
      } catch (e: unknown) {
        setUploadError(
          e instanceof Error ? e.message : 'Error subiendo la foto',
        );
      } finally {
        setUploading(false);
      }
    },
    [item.localId, onPhotoUploaded, onPreviewChange],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handlePhotoFile(file);
    },
    [handlePhotoFile],
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoFile(file);
  };

  const product = PRODUCTS[item.productId];
  const subtotal = product.price * item.quantity;

  return (
    <div className="relative border border-white/10 rounded-2xl p-4 space-y-4">
      {/* ── Delete button — badge on card corner ─────────────────── */}
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(item.localId)}
          className="absolute top-0 right-0 z-10 w-6 h-6 rounded-full  border-white/15 flex items-center justify-center text-white/40 hover:text-red-400 hover:border-red-400/40 transition-colors"
        >
          <Trash2 size={12} />
        </button>
      )}

      {/* ── Product selector ────────────────────────────────────── */}
      <div className="flex gap-2">
        {(
          [
            { id: 'rgb', label: 'RGB', src: '/gallery/lampara-1-v2.jpg' },
            {
              id: 'madera',
              label: 'Madera',
              src: '/gallery/lampara-madera-1.jpg',
            },
          ] as { id: ProductId; label: string; src: string }[]
        ).map(({ id, label, src }) => {
          const selected = item.productId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onProductChange(item.localId, id)}
              className={clsx(
                'flex-1 flex flex-col items-center gap-1.5 p-2 rounded-2xl border-2 transition-all active:scale-[0.97]',
                selected
                  ? 'border-amber-500 bg-amber-500/8'
                  : 'border-white/8 bg-white/3 hover:border-white/20',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={label}
                className={clsx(
                  'w-full aspect-square object-cover rounded-xl transition-all',
                  selected ? 'opacity-100' : 'opacity-40',
                )}
              />
              <span
                className={clsx(
                  'text-xs font-semibold',
                  selected ? 'text-amber-400' : 'text-white/35',
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Photo upload ─────────────────────────────────────────── */}
      <div>
        <p className="text-white/40 text-xs mb-2">
          Tu foto
          <span className="text-white/20 ml-2 font-normal">
            — cuanto más nítida, mejor el grabado
          </span>
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={clsx(
            'relative border-2 border-dashed rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center text-center touch-manipulation',
            item.localPhotoPreview ? 'p-2 min-h-28' : 'p-6 min-h-32',
            dragging
              ? 'border-amber-400 bg-amber-400/5'
              : item.localPhotoPreview || item.photoId
                ? 'border-amber-500/40 bg-amber-500/5 hover:border-amber-400/70'
                : 'border-white/15 hover:border-amber-400/50 active:border-amber-400/50',
          )}
        >
          {item.localPhotoPreview ? (
            <div className="relative w-full flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.localPhotoPreview}
                alt="Tu foto"
                className="max-h-40 max-w-full object-contain rounded-xl"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/50 rounded-xl transition-opacity">
                <span className="text-white text-xs font-semibold">
                  Cambiar foto
                </span>
              </div>
            </div>
          ) : item.photoId ? (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 size={32} className="text-amber-400" />
              <p className="font-semibold text-sm">Foto guardada ✓</p>
              <p className="text-white/40 text-xs">Toca para cambiarla</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Upload size={22} className="text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">
                  <span className="hidden md:inline">
                    Arrastra tu foto aquí
                  </span>
                  <span className="md:hidden">Toca para elegir tu foto</span>
                </p>
                <p className="text-white/30 text-xs mt-0.5">
                  JPG, PNG, WEBP · Máx 10 MB
                </p>
              </div>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-2xl gap-2">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-amber-400 text-xs font-medium">Subiendo…</p>
            </div>
          )}
        </div>
        {uploadError && (
          <p className="text-red-400 text-xs mt-1.5 text-center">
            {uploadError}
          </p>
        )}
      </div>

      {/* ── Quantity ─────────────────────────────────────────────── */}
      <div>
        <p className="text-white/40 text-xs mb-2">Cantidad</p>
        <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/8 px-4 py-2.5">
          <span className="text-amber-400 font-bold text-sm">
            ${subtotal.toLocaleString()} MXN
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                onQuantityChange(item.localId, Math.max(1, item.quantity - 1))
              }
              disabled={item.quantity <= 1}
              className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors active:scale-90"
            >
              <Minus size={14} />
            </button>
            <span className="w-5 text-center font-bold text-base text-white tabular-nums">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                onQuantityChange(item.localId, Math.min(10, item.quantity + 1))
              }
              disabled={item.quantity >= 10}
              className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-amber-400 disabled:opacity-25 disabled:cursor-not-allowed transition-colors active:scale-90"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Personalizations ─────────────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <label className="flex items-center gap-1.5 text-white/40 text-xs mb-2">
            <Type size={11} className="text-amber-400/70" />
            Texto grabado
            <span className="text-white/25 ml-auto">opcional · 40 car.</span>
          </label>
          <input
            type="text"
            maxLength={40}
            placeholder="Ej: Para siempre juntos · 14/02/2025"
            value={item.engravingText}
            onChange={(e) => onEngravingChange(item.localId, e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/50 transition-colors text-sm"
          />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-white/40 text-xs mb-2">
            <Music size={11} className="text-amber-400/70" />
            Código Spotify
            <span className="text-white/25 ml-auto">opcional</span>
          </label>
          <input
            type="text"
            placeholder="Ej: Perfect – Ed Sheeran"
            value={item.spotifyUrl}
            onChange={(e) => onSpotifyChange(item.localId, e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/50 transition-colors text-sm"
          />
        </div>
      </div>
    </div>
  );
}
