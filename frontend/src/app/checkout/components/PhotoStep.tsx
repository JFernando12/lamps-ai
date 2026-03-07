import { useRef, useCallback, useState } from 'react';
import { Upload, Type, Music } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';

interface Props {
  localPhotoPreview: string | null;
  onLocalPreviewChange: (v: string | null) => void;
  onPhotoUploaded: (photoId: string) => void;
  photoId: string | null;
  engravingText: string;
  setEngravingText: (v: string) => void;
  spotifyUrl: string;
  setSpotifyUrl: (v: string) => void;
  onContinue: () => void;
}

export function PhotoStep({
  localPhotoPreview,
  onLocalPreviewChange,
  onPhotoUploaded,
  photoId,
  engravingText,
  setEngravingText,
  spotifyUrl,
  setSpotifyUrl,
  onContinue,
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
      reader.onload = (e) => onLocalPreviewChange(e.target?.result as string);
      reader.readAsDataURL(file);
      setUploading(true);
      try {
        const result = await api.uploadPhoto(file);
        onPhotoUploaded(result.photo_id);
        const eventId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? `photo_${crypto.randomUUID().replace(/-/g, '')}`
            : `photo_${Date.now()}`;
        (window as { fbq?: (...args: unknown[]) => void }).fbq?.(
          'trackCustom',
          'PhotoUploaded',
          {},
          { eventID: eventId },
        );
      } catch (e: unknown) {
        setUploadError(
          e instanceof Error ? e.message : 'Error subiendo la foto',
        );
      } finally {
        setUploading(false);
      }
    },
    [onLocalPreviewChange, onPhotoUploaded],
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

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
        <Upload size={18} className="text-amber-400" />
        Sube tu foto
      </h2>
      <p className="text-white/50 text-sm mb-4">
        Usa una foto nítida con el sujeto bien visible. Cuanto mejor la foto,
        mejor el grabado.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />
      <input
        id="checkout-camera-input"
        type="file"
        accept="image/*"
        capture="environment"
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
          'relative border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all flex flex-col items-center justify-center min-h-48 text-center touch-manipulation',
          dragging
            ? 'border-amber-400 bg-amber-400/5'
            : 'border-white/20 hover:border-amber-400/50 active:border-amber-400/50',
        )}
      >
        {localPhotoPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={localPhotoPreview}
            alt="Tu foto"
            className="max-h-48 object-contain rounded-xl"
          />
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
              <Upload size={26} className="text-amber-400" />
            </div>
            <p className="font-semibold mb-1">
              <span className="hidden md:inline">Arrastra tu foto aquí</span>
              <span className="md:hidden">Toca para elegir tu foto</span>
            </p>
            <p className="text-white/40 text-sm hidden md:block">
              o haz clic para buscarla
            </p>
            <p className="text-white/25 text-xs mt-2">
              JPG, PNG, WEBP · Máx 10 MB
            </p>
          </>
        )}

        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-2xl gap-3">
            <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-amber-400 text-sm font-medium">
              Subiendo tu foto…
            </p>
          </div>
        )}
      </div>

      {!localPhotoPreview && !uploading && (
        <button
          type="button"
          onClick={() =>
            document.getElementById('checkout-camera-input')?.click()
          }
          className="md:hidden w-full flex items-center justify-center gap-2 border border-white/10 hover:border-amber-400/30 text-white/60 py-3 rounded-xl text-sm transition-colors touch-manipulation"
        >
          📷 Abrir cámara
        </button>
      )}

      {uploadError && (
        <p className="text-red-400 text-sm text-center">{uploadError}</p>
      )}

      <p className="text-center text-white/30 text-xs">
        Tu foto se procesa de forma segura y no se comparte con nadie
      </p>

      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-xs">
            personalizaciones opcionales
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <div>
          <label className="flex items-center gap-2 text-white/60 text-sm mb-1.5">
            <Type size={14} className="text-amber-400" />
            Texto grabado
          </label>
          <input
            type="text"
            maxLength={40}
            placeholder="Ej: Para siempre juntos · 14/02/2025"
            value={engravingText}
            onChange={(e) => setEngravingText(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/60 transition-colors text-sm"
          />
          <p className="text-white/25 text-xs mt-1.5">
            Se graba entre la imagen y la base. Máx 40 caracteres. Opcional.
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2 text-white/60 text-sm mb-1.5">
            <Music size={14} className="text-amber-400" />
            Código Spotify
          </label>
          <input
            type="text"
            placeholder="Ej: Perfect – Ed Sheeran"
            value={spotifyUrl}
            onChange={(e) => setSpotifyUrl(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/60 transition-colors text-sm"
          />
          <p className="text-white/25 text-xs mt-1.5">
            Pon el nombre de la canción o pega el link de Spotify. Grabaremos
            el código en el acrílico para que cualquiera lo escanee. Opcional.
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={!photoId || uploading}
        onClick={onContinue}
        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed mt-2"
      >
        Continuar
      </button>
    </div>
  );
}
