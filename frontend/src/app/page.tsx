"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Upload, Sparkles, ArrowRight, CheckCircle2, Star, Zap, Shield } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import clsx from "clsx";

interface PreviewResult {
  preview_id: string;
  render_url: string;
}

export default function HomePage() {
  const { user } = useAuth();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Por favor sube una imagen (JPG, PNG, WEBP).");
      return;
    }
    setError(null);
    setPreview(null);
    const reader = new FileReader();
    reader.onload = (e) => setLocalPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const result = await api.uploadPreview(file);
      setPreview(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error generando preview");
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
    [processFile]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-12 md:pt-28 md:pb-20 px-4 overflow-hidden">
        {/* Glow background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-[120px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 text-amber-400 text-sm mb-6">
            <Sparkles size={14} />
            Generado con Inteligencia Artificial
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-tight mb-4 md:mb-6">
            Tu foto,{" "}
            <span className="text-amber-400">convertida</span>
            <br />
            en una lámpara única
          </h1>

          <p className="text-base md:text-xl text-white/60 max-w-2xl mx-auto mb-8 md:mb-10">
            Sube tu foto, nuestra IA la convierte en lineart y la grabamos con
            láser en acrílico LED. Una pieza única con tu historia.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#preview"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold px-8 py-4 rounded-2xl text-lg transition-all hover:scale-105 touch-manipulation"
            >
              <Sparkles size={20} />
              Prueba con tu foto gratis
            </a>
            <a
              href="#como-funciona"
              className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/50 text-white px-8 py-4 rounded-2xl text-lg transition-colors touch-manipulation"
            >
              Cómo funciona
              <ArrowRight size={18} />
            </a>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-1.5 mt-10 text-white/40 text-sm">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={14} fill="currentColor" className="text-amber-400/70" />
            ))}
            <span className="ml-2">+200 lámparas entregadas</span>
          </div>
        </div>
      </section>

      {/* ── PREVIEW GENERATOR ───────────────────────────────────── */}
      <section id="preview" className="py-12 md:py-24 px-4 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Prueba con <span className="text-amber-400">tu foto</span>
            </h2>
            <p className="text-white/50 text-base md:text-lg">
              Sube una foto y nuestra IA generará un preview de cómo quedaría tu
              lámpara personalizada
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
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={clsx(
                  "relative border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all flex flex-col items-center justify-center min-h-56 text-center touch-manipulation",
                  dragging
                    ? "border-amber-400 bg-amber-400/5"
                    : "border-white/20 hover:border-amber-400/50 active:border-amber-400/50 hover:bg-white/[0.02]"
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
                      <span className="hidden md:inline">Arrastra tu foto aquí</span>
                      <span className="md:hidden">Toca para elegir tu foto</span>
                    </p>
                    <p className="text-white/40 text-sm hidden md:block">o haz clic para buscarla</p>
                    <p className="text-white/25 text-xs mt-3">JPG, PNG, WEBP · Máx 10 MB</p>
                  </>
                )}

                {uploading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-2xl gap-3">
                    <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-amber-400 text-sm font-medium">
                      Generando tu lámpara…
                    </p>
                  </div>
                )}
              </div>

              {/* Mobile: explicit camera button */}
              {!localPreview && !uploading && (
                <button
                  onClick={() => document.getElementById("camera-input")?.click()}
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

                  <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                    <CheckCircle2 size={20} className="text-green-400 shrink-0 mt-0.5" />
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
                      href={`/checkout?preview_id=${preview.preview_id}`}
                      className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-4 rounded-2xl text-lg transition-all hover:scale-[1.02]"
                    >
                      Pedir esta lámpara
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
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 flex flex-col items-center justify-center min-h-64 text-center">
                  <div className="w-20 h-20 rounded-full bg-amber-500/5 border border-amber-500/20 flex items-center justify-center mb-4">
                    <Sparkles size={32} className="text-amber-400/50" />
                  </div>
                  <p className="text-white/30 text-sm">
                    Tu preview aparecerá aquí en segundos
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ───────────────────────────────────────── */}
      <section id="como-funciona" className="py-12 md:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 md:mb-16">
            Cómo funciona
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Upload size={28} className="text-amber-400" />,
                step: "01",
                title: "Sube tu foto",
                desc: "Cualquier foto tuya, de pareja, familia o mascota. Cuanto más claro el sujeto, mejor el resultado.",
              },
              {
                icon: <Sparkles size={28} className="text-amber-400" />,
                step: "02",
                title: "La IA genera el diseño",
                desc: "Nuestra IA convierte la foto en un lineart minimalista listo para grabar en acrílico LED.",
              },
              {
                icon: <Zap size={28} className="text-amber-400" />,
                step: "03",
                title: "Producción y envío",
                desc: "Grabamos tu diseño con láser y te lo enviamos en 5–7 días hábiles con seguimiento.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:border-amber-400/30 transition-colors"
              >
                <span className="text-6xl font-black text-white/5 absolute top-4 right-6 select-none">
                  {item.step}
                </span>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCTO / PRECIO ───────────────────────────────────── */}
      <section id="pedido" className="py-12 md:py-24 px-4 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-3xl p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1 text-amber-400 text-xs mb-4">
                  <Shield size={12} />
                  PRODUCTO ÚNICO
                </div>
                <h2 className="text-4xl font-extrabold mb-4">
                  Lámpara acrílica
                  <br />
                  <span className="text-amber-400">LED personalizada</span>
                </h2>
                <ul className="space-y-3 mb-8">
                  {[
                    "Acrílico transparente de 5 mm",
                    "Base LED con luz cálida",
                    "Diseño grabado con láser de precisión",
                    "Tamaño 20×15 cm",
                    "Cable USB incluido",
                    "Envío a todo México",
                  ].map((feat) => (
                    <li key={feat} className="flex items-center gap-2.5 text-white/80 text-sm">
                      <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <div className="flex items-end gap-3 mb-6">
                  <span className="text-5xl font-extrabold">$799</span>
                  <span className="text-white/40 mb-2">MXN · envío gratis</span>
                </div>
                <a
                  href="#preview"
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold px-8 py-4 rounded-2xl text-lg transition-all hover:scale-105"
                >
                  <Sparkles size={20} />
                  Genera tu preview gratis
                </a>
              </div>

              {/* Placeholder product image */}
              <div className="flex items-center justify-center">
                <div className="w-64 h-64 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-center text-center p-6">
                  <p className="text-white/20 text-sm">
                    Aquí va la foto del producto
                    <br />
                    (lampara_referencia.jpg)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-white/30 text-sm">
          <span className="font-bold text-amber-400">Lamps AI</span>
          <p>© {new Date().getFullYear()} Lamps AI. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacidad</a>
            <a href="#" className="hover:text-white transition-colors">Términos</a>
            <a href="mailto:hola@lamps.ai" className="hover:text-white transition-colors">
              Contacto
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
