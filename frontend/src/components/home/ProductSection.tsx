import Image from 'next/image';
import { CheckCircle2, Shield, Sparkles, Zap } from 'lucide-react';

const FEATURES = [
  'Acrílico transparente de 5 mm',
  'Base LED con luz cálida',
  'Diseño grabado con láser de precisión',
  'Tamaño 20×15 cm',
  'Cable USB incluido',
  'Envío a todo México',
];

export function ProductSection() {
  return (
    <section id="pedido" className="py-12 md:py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-linear-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-3xl p-8 md:p-12">
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
                {FEATURES.map((feat) => (
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
              <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-7">
                <Shield size={16} className="text-green-400 shrink-0 mt-0.5" />
                <p className="text-green-300 text-xs leading-relaxed">
                  <span className="font-bold">Garantía de satisfacción:</span>{' '}
                  si el diseño no te convence, lo rehacemos gratis.
                </p>
              </div>
              <div className="flex items-end gap-3 mb-3">
                <span className="text-5xl font-extrabold">$598</span>
                <div className="mb-2">
                  <span className="line-through text-white/30 text-lg block">
                    $999
                  </span>
                  <span className="text-white/40 text-sm">
                    MXN · envío gratis
                  </span>
                </div>
              </div>
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
            <div className="flex items-center justify-center">
              <div className="relative w-72 h-72 rounded-2xl overflow-hidden border border-amber-500/20 shadow-xl shadow-amber-500/10">
                <Image
                  src="/gallery/lampara-1-v2.jpg"
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
  );
}
