import Image from 'next/image';
import { Sparkles, ArrowRight, Star } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative pt-20 pb-10 md:pt-28 md:pb-20 px-4 overflow-hidden">
      {/* TEMP: blur-[120px] decorative div removed for perf diagnostic — restore before merging */}
      <div className="relative max-w-5xl mx-auto">
        <div className="grid md:grid-cols-[5fr_6fr] gap-8 items-center">
          <div className="text-center md:text-left order-2 md:order-1">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 text-amber-400 text-xs md:text-sm mb-3 md:mb-6">
              <Sparkles size={14} />
              Diseño personalizado · Grabado con láser
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-2 md:mb-6">
              Tu recuerdo <span className="text-amber-400">convertido</span>
              <br />
              en una lámpara única
            </h1>
            <div className="flex items-center justify-center md:justify-start gap-2 md:gap-3 mb-2 md:mb-6">
              <span className="text-white/40 text-base md:text-xl line-through">
                $999
              </span>
              <span className="text-amber-400 text-2xl md:text-4xl font-extrabold">
                $597 MXN
              </span>
              <span className="bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full">
                -40% hoy
              </span>
            </div>
            <p className="text-sm md:text-xl text-white/60 max-w-xl mx-auto md:mx-0 mb-4 md:mb-10">
              Sube tu foto y la grabamos con láser en acrílico LED. Una pieza
              única, hecha a mano, con tu historia.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <a
                href="#pedido"
                className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold px-8 py-4 rounded-2xl text-lg transition-all hover:scale-105 touch-manipulation"
              >
                <Sparkles size={20} />
                Pedir mi lámpara
              </a>
              <a
                href="#pedido"
                className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/50 text-white px-8 py-4 rounded-2xl text-lg transition-colors touch-manipulation"
              >
                Ver las opciones
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
          <div className="flex items-center justify-center order-1 md:order-2">
            <div className="relative w-84 h-84 md:w-104 md:h-104 rounded-3xl overflow-hidden border border-amber-500/20 shadow-2xl shadow-amber-500/10">
              <Image
                src="/gallery/lampara-1-v2.jpg"
                alt="Lámpara acrílica LED personalizada"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 336px, 416px"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
