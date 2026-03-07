'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { CheckCircle2, Shield, Sparkles, Zap, Flame } from 'lucide-react';
import { getEvent } from '@/lib/pixelEvents';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const PRODUCTS = [
  {
    id: 'rgb',
    href: '/checkout?product=rgb',
    badge: '🔥 Más popular',
    badgeClass: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
    cardClass:
      'border-amber-500/30 bg-linear-to-br from-amber-500/10 to-amber-600/5',
    accentClass: 'text-amber-400',
    btnClass: 'bg-amber-500 hover:bg-amber-400 text-black',
    title: 'Lámpara acrílica',
    titleAccent: 'LED RGB',
    price: 598,
    originalPrice: 999,
    tagline: '16 colores · control remoto incluido',
    ctaLabel: 'Pedir Lámpara RGB',
    image: '/gallery/lampara-2-v2.jpg',
    imageAlt: 'Lámpara acrílica LED RGB personalizada',
    features: [
      'Acrílico transparente de 5 mm',
      '16 colores RGB con control remoto',
      'Diseño grabado con láser de precisión',
      'Tamaño 20×15 cm',
      'Cable USB incluido · envío gratis',
    ],
  },
  {
    id: 'madera',
    href: '/checkout?product=madera',
    badge: '✨ Edición premium',
    badgeClass: 'bg-orange-500/15 border-orange-400/40 text-orange-300',
    cardClass:
      'border-orange-400/25 bg-linear-to-br from-orange-500/8 to-yellow-600/5',
    accentClass: 'text-orange-300',
    btnClass: 'bg-orange-400 hover:bg-orange-300 text-black',
    title: 'Lámpara base',
    titleAccent: 'de madera',
    price: 719,
    originalPrice: 1199,
    tagline: 'Base de madera natural · luz cálida',
    ctaLabel: 'Pedir Lámpara Madera',
    image: '/gallery/lampara-madera-1.jpg',
    imageAlt: 'Lámpara base de madera luz cálida personalizada',
    features: [
      'Base de madera natural maciza',
      'Luz cálida 3000K — ambiente perfecto',
      'Diseño grabado con láser de precisión',
      'Tamaño 20×15 cm',
      'Cable USB incluido · envío gratis',
    ],
  },
];

export function ProductSection() {
  const sectionRef = useRef<HTMLElement>(null);

  // Fire ViewContent once when the section scrolls into view
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          getEvent('ViewContent').track();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="pedido" ref={sectionRef} className="py-12 md:py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-3">
            Elige tu lámpara
          </h2>
          <p className="text-white/50 text-base max-w-md mx-auto">
            Ambas llevan tu foto grabada con láser. Elige el estilo que mejor
            combine con quien la recibirá.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {PRODUCTS.map((p) => (
            <div
              key={p.id}
              className={`border rounded-3xl p-7 md:p-9 flex flex-col ${p.cardClass}`}
            >
              {/* Badge */}
              <div className="mb-4">
                <span
                  className={`inline-flex items-center gap-1.5 border rounded-full px-3 py-1 text-xs font-semibold ${p.badgeClass}`}
                >
                  {p.badge}
                </span>
              </div>

              {/* Image */}
              <div className="relative w-full h-52 rounded-2xl overflow-hidden border border-white/10 mb-6">
                <Image
                  src={p.image}
                  alt={p.imageAlt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>

              {/* Title */}
              <h3 className="text-2xl font-extrabold mb-1">
                {p.title}
                <br />
                <span className={p.accentClass}>{p.titleAccent}</span>
              </h3>
              <p className={`text-xs mb-5 ${p.accentClass} opacity-80`}>
                {p.tagline}
              </p>

              {/* Features */}
              <ul className="space-y-2.5 mb-7 flex-1">
                {p.features.map((feat) => (
                  <li
                    key={feat}
                    className="flex items-center gap-2.5 text-white/75 text-sm"
                  >
                    <CheckCircle2
                      size={15}
                      className={`${p.accentClass} shrink-0`}
                    />
                    {feat}
                  </li>
                ))}
              </ul>

              {/* Guarantee */}
              <div className="flex items-start gap-2 bg-green-500/8 border border-green-500/20 rounded-xl p-3 mb-6">
                <Shield size={14} className="text-green-400 shrink-0 mt-0.5" />
                <p className="text-green-300 text-xs leading-relaxed">
                  <span className="font-bold">Garantía:</span> si el diseño no
                  te convence, lo rehacemos gratis.
                </p>
              </div>

              {/* Price */}
              <div className="flex items-end gap-3 mb-2">
                <span className="text-4xl font-extrabold">${p.price}</span>
                <div className="mb-1">
                  <span className="line-through text-white/30 text-base block">
                    ${p.originalPrice}
                  </span>
                  <span className="text-white/40 text-xs">
                    MXN · envío gratis
                  </span>
                </div>
              </div>
              <p
                className={`${p.accentClass} opacity-70 text-xs mb-6 flex items-center gap-1.5`}
              >
                <Zap size={11} />
                Producción limitada — pocos pedidos por semana
              </p>

              {/* CTA */}
              <a
                href={p.href}
                onClick={() =>
                  getEvent('AddToCart').track({
                    contentId: p.id,
                    value: p.price,
                  })
                }
                className={`w-full flex items-center justify-center gap-2 font-bold px-6 py-4 rounded-2xl text-base transition-all hover:scale-[1.03] active:scale-100 ${p.btnClass}`}
              >
                {p.id === 'rgb' ? <Flame size={18} /> : <Sparkles size={18} />}
                {p.ctaLabel}
              </a>
            </div>
          ))}
        </div>

        {/* Reassurance strip */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-white/35 text-xs">
          <span className="flex items-center gap-1.5">
            <Shield size={13} /> Pago 100% seguro
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={13} /> Envío gratis a México
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles size={13} /> Hecha a mano
          </span>
        </div>
      </div>
    </section>
  );
}
