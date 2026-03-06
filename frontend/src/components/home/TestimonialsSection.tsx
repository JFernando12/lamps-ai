import { Star } from 'lucide-react';
import { TESTIMONIALS } from './data';

export function TestimonialsSection() {
  return (
    <section className="py-12 md:py-20 px-4 bg-white/2">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-3">
          Lo que dicen <span className="text-amber-400">nuestros clientes</span>
        </h2>
        <p className="text-center text-white/40 text-sm mb-10">
          Reseñas reales de personas reales
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-white/3 border border-white/10 rounded-2xl p-6 flex flex-col gap-4"
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
  );
}
