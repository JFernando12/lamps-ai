import { useRef, useCallback, useState } from 'react';
import { Upload, Type, Music, CheckCircle2, Package } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { getEvent } from '@/lib/pixelEvents';

interface Props {
  localPhotoPreview: string | null;
  onLocalPreviewChange: (v: string | null) => void;
  onPhotoUploaded: (photoId: string) => void;
  photoId: string | null;
  engravingText: string;
  setEngravingText: (v: string) => void;
  spotifyUrl: string;
  setSpotifyUrl: (v: string) => void;
  // Cuenta opcional
  isLoggedIn: boolean;
  accountMode: 'login' | 'register';
  setAccountMode: (v: 'login' | 'register') => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  error: string | null;
  loading: boolean;
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
  isLoggedIn,
  accountMode,
  setAccountMode,
  email,
  setEmail,
  password,
  setPassword,
  error,
  loading,
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
        getEvent('PhotoUploaded').track();
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
        ) : photoId ? (
          /* Draft restored — photo is on the server but preview not cached */
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 size={40} className="text-amber-400" />
            <p className="font-semibold">Foto guardada ✓</p>
            <p className="text-white/40 text-sm">
              Toca para cambiarla si quieres
            </p>
          </div>
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
            Pon el nombre de la canción o pega el link de Spotify. Grabaremos el
            código en el acrílico para que cualquiera lo escanee. Opcional.
          </p>
        </div>
      </div>

      {/* ── Cuenta opcional ───────────────────────────────────────── */}
      {!isLoggedIn && (
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 text-white/40 text-xs">
            <Package size={13} className="text-amber-400/70 shrink-0" />
            <p>Opcional — crea una cuenta para rastrear tu pedido.</p>
          </div>

          <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
            {(['register', 'login'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setAccountMode(m)}
                className={clsx(
                  'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                  accountMode === m
                    ? 'bg-amber-500 text-black'
                    : 'text-white/50 hover:text-white',
                )}
              >
                {m === 'register' ? 'Crear cuenta' : 'Ya tengo cuenta'}
              </button>
            ))}
          </div>

          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/60 transition-colors text-sm"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/60 transition-colors text-sm"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      )}

      <button
        type="button"
        disabled={!photoId || uploading || loading}
        onClick={onContinue}
        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed mt-2"
      >
        {loading ? 'Cargando…' : 'Continuar'}
      </button>
    </div>
  );
}
