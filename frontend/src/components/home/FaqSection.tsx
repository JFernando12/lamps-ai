'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { FAQS } from './data';

export function FaqSection() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  return (
    <section className="py-12 md:py-20 px-4 bg-white/2">
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
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/2 transition-colors touch-manipulation"
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
  );
}
