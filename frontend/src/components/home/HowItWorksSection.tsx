import { Upload, Sparkles, Zap } from 'lucide-react';

const STEPS = [
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
];

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="py-12 md:py-24 px-4 bg-white/2">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 md:mb-16">
          Cómo se hace
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((item) => (
            <div
              key={item.step}
              className="relative bg-white/3 border border-white/10 rounded-2xl p-6 hover:border-amber-400/30 transition-colors"
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
  );
}
