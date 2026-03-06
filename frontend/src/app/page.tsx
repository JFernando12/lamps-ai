"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Upload,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Star,
  Zap,
  Shield,
  MessageCircle,
  ChevronDown,
  Instagram,
  Facebook,
} from 'lucide-react';
import clsx from 'clsx';
// import PreviewGenerator from '@/components/PreviewGenerator';

const GALLERY_IMAGES = [
  '/gallery/lampara-1.jpg',
  '/gallery/lampara-2.jpg',
  '/gallery/lampara-3.jpg',
  '/gallery/lampara-4.jpg',
];

const TESTIMONIALS = [
  {
    name: 'Mariana R.',
    city: 'Ciudad de México',
    stars: 5,
    occasion: 'Aniversario',
    text: 'Mi esposo lloró cuando la vio. Era nuestra foto de boda convertida en una lámpara preciosa. La calidad es increíble y llegó antes de lo esperado.',
  },
  {
    name: 'Carlos M.',
    city: 'Guadalajara',
    stars: 5,
    occasion: 'Cumpleaños',
    text: 'Le regalé una a mi mamá en su cumpleaños 60 con una foto de los dos. No podía creer que fuera una foto real grabada en el acrílico. Superó todas mis expectativas.',
  },
  {
    name: 'Sofía L.',
    city: 'Monterrey',
    stars: 5,
    occasion: 'Día de madres',
    text: 'El proceso fue facilísimo. Subí la foto, confirmé el pedido y en menos de una semana ya la tenía en casa. La calidad superó mis expectativas. Definitivamente voy a pedir más.',
  },
];

const OCCASIONS = [
  { emoji: '🎂', label: 'Cumpleaños', desc: 'El regalo que nunca olvidarán' },
  { emoji: '💑', label: 'Aniversario', desc: 'Su foto juntos, para siempre' },
  { emoji: '👩', label: 'Día de madres', desc: 'Un abrazo hecho lámpara' },
  { emoji: '🐾', label: 'Mascotas', desc: 'El mejor tributo a tu compañero' },
  { emoji: '💍', label: 'Boda', desc: 'Recuerdo eterno del gran día' },
  { emoji: '👶', label: 'Baby shower', desc: 'La primera foto, inmortalizada' },
];

const FAQS = [
  {
    q: '¿Qué pasa si mi foto no queda bien?',
    a: 'Si el diseño grabado no te satisface, lo rehacemos sin costo adicional. Tu satisfacción está garantizada.',
  },
  {
    q: '¿Cuánto mide exactamente?',
    a: 'La placa acrílica mide 20×15 cm y la base LED 7 cm de diámetro. Perfecta para escritorios, burós y repisas.',
  },
  {
    q: '¿Cuánto tarda en llegar?',
    a: 'Producción: 3–4 días hábiles. Envío a todo México: 2–3 días adicionales. Total: 5–7 días hábiles desde que confirmas tu pedido.',
  },
  {
    q: '¿Puedo dejarla encendida toda la noche?',
    a: 'Sí, los LEDs consumen muy poca energía y no generan calor. Muchos clientes la dejan encendida toda la noche como luz de ambiente.',
  },
  {
    q: '¿Qué métodos de pago aceptan?',
    a: 'Tarjeta de crédito/débito, transferencia bancaria y Mercado Pago. El pago es 100% seguro.',
  },
  {
    q: '¿Hacen envíos fuera de México?',
    a: 'Por ahora solo enviamos a México. Si te interesa envío internacional, escríbenos por WhatsApp.',
  },
];

export default function HomePage() {
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  // Auto-advance gallery carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setGalleryIdx((prev) => (prev + 1) % GALLERY_IMAGES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-10 md:pt-28 md:pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-[120px]" />
        </div>
        <div className="relative max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Text */}
            <div className="text-center md:text-left order-2 md:order-1">
              <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 text-amber-400 text-sm mb-6">
                <Sparkles size={14} />
                Diseño personalizado · Grabado con láser
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-4 md:mb-6">
                Tu foto, <span className="text-amber-400">convertida</span>
                <br />
                en una lámpara única
              </h1>
              <p className="text-base md:text-xl text-white/60 max-w-xl mx-auto md:mx-0 mb-8 md:mb-10">
                Sube tu foto y la grabamos con láser en acrílico LED. Una pieza
                única, hecha a mano, con tu historia.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <a
                  href="/checkout"
                  className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold px-8 py-4 rounded-2xl text-lg transition-all hover:scale-105 touch-manipulation"
                >
                  <Sparkles size={20} />
                  Pedir mi lámpara
                </a>
                <a
                  href="#como-funciona"
                  className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/50 text-white px-8 py-4 rounded-2xl text-lg transition-colors touch-manipulation"
                >
                  Cómo se hace
                  <ArrowRight size={18} />
                </a>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-1.5 mt-8 text-white/40 text-sm">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    fill="currentColor"
                    className="text-amber-400/70"
                  />
                ))}
                <span className="ml-2">+200 lámparas entregadas · ⭐ 5.0</span>
              </div>
            </div>
            {/* Hero image */}
            <div className="flex items-center justify-center order-1 md:order-2">
              <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-3xl overflow-hidden border border-amber-500/20 shadow-2xl shadow-amber-500/10">
                <Image
                  src="/gallery/lampara-1.jpg"
                  alt="Lámpara acrílica LED personalizada"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 256px, 320px"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── GALERÍA ─────────────────────────────────────────────── */}
      <section className="py-12 md:py-20 px-4 bg-white/[0.02]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-2">
            Diseños <span className="text-amber-400">reales</span>
          </h2>
          <p className="text-center text-white/40 text-sm mb-8">
            Lámparas que ya están en hogares de México
          </p>
          <div
            className="relative overflow-hidden rounded-3xl"
            style={{ aspectRatio: '4/3' }}
          >
            {GALLERY_IMAGES.map((src, i) => (
              <div
                key={src}
                className={clsx(
                  'absolute inset-0 transition-opacity duration-700',
                  i === galleryIdx ? 'opacity-100 z-10' : 'opacity-0 z-0',
                )}
              >
                <Image
                  src={src}
                  alt={`Lámpara personalizada ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 768px"
                  priority={i === 0}
                />
              </div>
            ))}
            <button
              onClick={() =>
                setGalleryIdx(
                  (prev) =>
                    (prev - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length,
                )
              }
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white text-xl transition-colors"
              aria-label="Anterior"
            >
              &#8249;
            </button>
            <button
              onClick={() =>
                setGalleryIdx((prev) => (prev + 1) % GALLERY_IMAGES.length)
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white text-xl transition-colors"
              aria-label="Siguiente"
            >
              &#8250;
            </button>
            <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2">
              {GALLERY_IMAGES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setGalleryIdx(i)}
                  className={clsx(
                    'w-2.5 h-2.5 rounded-full transition-colors',
                    i === galleryIdx
                      ? 'bg-amber-400'
                      : 'bg-white/30 hover:bg-white/60',
                  )}
                  aria-label={`Imagen ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ───────────────────────────────────────── */}
      <section
        id="como-funciona"
        className="py-12 md:py-24 px-4 bg-white/[0.02]"
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 md:mb-16">
            Cómo se hace
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Upload size={28} className="text-amber-400" />,
                step: '01',
                title: 'Sube tu foto',
                desc: 'Cualquier foto tuya, de pareja, familia o mascota. Cuanto más claro el sujeto, mejor el resultado.',
              },
              {
                icon: <Sparkles size={28} className="text-amber-400" />,
                step: '02',
                title: 'Revisa y paga',
                desc: 'Confirma tu pedido y realiza el pago. Si el diseño final no te satisface, lo rehacemos sin costo.',
              },
              {
                icon: <Zap size={28} className="text-amber-400" />,
                step: '03',
                title: 'Producción y envío',
                desc: 'Grabamos tu diseño con láser y te lo enviamos en 5–7 días hábiles con seguimiento.',
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
                <p className="text-white/50 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PARA QUIÉN ──────────────────────────────────────────── */}
      <section className="py-12 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-3">
            Perfecto para <span className="text-amber-400">cada ocasión</span>
          </h2>
          <p className="text-center text-white/40 text-sm mb-10">
            El regalo más personal que existe
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {OCCASIONS.map((occ) => (
              <div
                key={occ.label}
                className="bg-white/[0.03] border border-white/10 hover:border-amber-400/30 rounded-2xl p-5 text-center transition-colors"
              >
                <div className="text-4xl mb-3">{occ.emoji}</div>
                <p className="font-bold text-sm mb-1">{occ.label}</p>
                <p className="text-white/40 text-xs">{occ.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIOS ─────────────────────────────────────────── */}
      <section className="py-12 md:py-20 px-4 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-3">
            Lo que dicen{' '}
            <span className="text-amber-400">nuestros clientes</span>
          </h2>
          <p className="text-center text-white/40 text-sm mb-10">
            Reseñas reales de personas reales
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 flex flex-col gap-4"
              >
                <div className="flex gap-0.5">
                  {[...Array(t.stars)].map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      fill="currentColor"
                      className="text-amber-400"
                    />
                  ))}
                </div>
                <p className="text-white/70 text-sm leading-relaxed flex-1">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">{t.name}</p>
                    <p className="text-white/30 text-xs">{t.city}</p>
                  </div>
                  <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-1 rounded-full">
                    {t.occasion}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCTO / PRECIO ───────────────────────────────────── */}
      <section id="pedido" className="py-12 md:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-3xl p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1 text-amber-400 text-xs mb-4">
                  <Shield size={12} />
                  PRODUCTO ÚNICO · HECHO A MANO
                </div>
                <h2 className="text-4xl font-extrabold mb-6">
                  Lámpara acrílica
                  <br />
                  <span className="text-amber-400">LED personalizada</span>
                </h2>
                <ul className="space-y-4 mb-10">
                  {[
                    'Acrílico transparente de 5 mm',
                    'Base LED con luz cálida',
                    'Diseño grabado con láser de precisión',
                    'Tamaño 20×15 cm',
                    'Cable USB incluido',
                    'Envío a todo México',
                  ].map((feat) => (
                    <li
                      key={feat}
                      className="flex items-center gap-2.5 text-white/80 text-sm"
                    >
                      <CheckCircle2
                        size={16}
                        className="text-amber-400 shrink-0"
                      />
                      {feat}
                    </li>
                  ))}
                </ul>
                {/* Guarantee */}
                <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-7">
                  <Shield
                    size={16}
                    className="text-green-400 shrink-0 mt-0.5"
                  />
                  <p className="text-green-300 text-xs leading-relaxed">
                    <span className="font-bold">Garantía de satisfacción:</span>{' '}
                    si el diseño no te convence, lo rehacemos gratis.
                  </p>
                </div>
                {/* Price */}
                <div className="flex items-end gap-3 mb-3">
                  <span className="text-5xl font-extrabold">$799</span>
                  <div className="mb-2">
                    <span className="line-through text-white/30 text-lg block">
                      $1,299
                    </span>
                    <span className="text-white/40 text-sm">
                      MXN · envío gratis
                    </span>
                  </div>
                </div>
                {/* Urgency */}
                <p className="text-amber-400/80 text-xs mb-8 flex items-center gap-1.5">
                  <Zap size={12} />
                  Producción limitada. Solo aceptamos pocos pedidos por semana
                  para cuidar la calidad.
                </p>
                <a
                  href="/checkout"
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold px-8 py-4 rounded-2xl text-lg transition-all hover:scale-105"
                >
                  <Sparkles size={20} />
                  Pedir mi lámpara
                </a>
              </div>

              {/* Product image */}
              <div className="flex items-center justify-center">
                <div className="relative w-72 h-72 rounded-2xl overflow-hidden border border-amber-500/20 shadow-xl shadow-amber-500/10">
                  <Image
                    src="/gallery/lampara-1.jpg"
                    alt="Lámpara acrílica LED personalizada"
                    fill
                    className="object-cover"
                    sizes="288px"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section className="py-12 md:py-20 px-4 bg-white/[0.02]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-3">
            Preguntas <span className="text-amber-400">frecuentes</span>
          </h2>
          <p className="text-center text-white/40 text-sm mb-10">
            ¿Tienes dudas? Aquí resolvemos las más comunes
          </p>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="border border-white/10 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors touch-manipulation"
                >
                  <span className="font-semibold text-sm text-white/90">
                    {faq.q}
                  </span>
                  <ChevronDown
                    size={18}
                    className={clsx(
                      'shrink-0 text-amber-400 transition-transform duration-300',
                      faqOpen === i && 'rotate-180',
                    )}
                  />
                </button>
                {faqOpen === i && (
                  <div className="px-5 pb-4">
                    <p className="text-white/50 text-sm leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-white/30 text-sm mt-8">
            ¿Tienes otra duda?{' '}
            <a
              href="https://wa.me/527551155510"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:underline"
            >
              Escríbenos por WhatsApp
            </a>
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-white/30 text-sm">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="font-bold text-amber-400 text-lg">
              The Dream Gift
            </span>
            <p>
              © {new Date().getFullYear()} The Dream Gift. Todos los derechos
              reservados.
            </p>
          </div>
          {/* Social */}
          <div className="flex items-center gap-5 text-white/40">
            <a
              href="https://instagram.com/thedreamgift.mx"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              aria-label="Instagram"
            >
              <Instagram size={20} />
            </a>
            <a
              href="https://facebook.com/thedreamgift.mx"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              aria-label="Facebook"
            >
              <Facebook size={20} />
            </a>
            <a
              href="https://wa.me/527551155510"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              aria-label="WhatsApp"
            >
              <MessageCircle size={20} />
            </a>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">
              Privacidad
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Términos
            </a>
            <a
              href="mailto:hola@thedreamgift.mx"
              className="hover:text-white transition-colors"
            >
              Contacto
            </a>
          </div>
        </div>
      </footer>

      {/* ── WHATSAPP FLOTANTE ────────────────────────────────────── */}
      <a
        href="https://wa.me/527551155510"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-4 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold pl-4 pr-5 py-3 rounded-full shadow-lg shadow-black/40 transition-all hover:scale-105 touch-manipulation"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle size={22} />
        <span className="text-sm whitespace-nowrap">¿Dudas? Escríbenos</span>
      </a>
    </main>
  );
}
