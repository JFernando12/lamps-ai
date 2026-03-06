import { OCCASIONS } from './data';

export function OccasionsSection() {
  return (
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
              className="bg-white/3 border border-white/10 hover:border-amber-400/30 rounded-2xl p-5 text-center transition-colors"
            >
              <div className="text-4xl mb-3">{occ.emoji}</div>
              <p className="font-bold text-sm mb-1">{occ.label}</p>
              <p className="text-white/40 text-xs">{occ.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
