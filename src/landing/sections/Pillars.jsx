import { useInView } from '../hooks/useInView';

const PILLARS = [
  {
    n: 1,
    icon: '🫀',
    title: 'VO₂ Max',
    sub: 'Norwegian 4×4 intervals',
    desc: '4 rounds of 4-min work at 85-95% max HR, with 3-min active rest. The single best predictor of all-cause mortality — and the lowest time-cost of any longevity intervention.',
    color: 'rose',
  },
  {
    n: 2,
    icon: '🦵',
    title: 'Strength',
    sub: 'Periodized 6-week cycles',
    desc: 'Heavy compound lifts on a planned progression. Armor calculates your sets, reps, and weights from your estimated 1RM — no spreadsheets, no guesswork.',
    color: 'cyan',
  },
  {
    n: 3,
    icon: '🧬',
    title: 'Metabolic Health',
    sub: 'Post-meal walks',
    desc: 'Two 10-minute walks (after lunch, after dinner) blunt glucose spikes by 30%. Non-negotiable. Armor tracks them as part of the daily stack.',
    color: 'emerald',
  },
  {
    n: 4,
    icon: '🧘',
    title: 'Mobility',
    sub: '5-min evening floor work',
    desc: 'Hips, hamstrings, thoracic spine. Counter the desk-worker posture that compresses your organs and shortens your stride.',
    color: 'amber',
  },
  {
    n: 5,
    icon: '⚖️',
    title: 'Neurological',
    sub: 'Single-leg balance, eyes closed',
    desc: '2-3 minutes per leg. Stack with a daily anchor (coffee, brushing teeth). Falls kill more adults over 65 than any other injury. Build the reflex now.',
    color: 'purple',
  },
];

const COLOR_MAP = {
  rose: 'from-rose-500/20 border-rose-500/30 text-rose-400',
  cyan: 'from-cyan-500/20 border-cyan-500/30 text-cyan-400',
  emerald: 'from-emerald-500/20 border-emerald-500/30 text-emerald-400',
  amber: 'from-amber-500/20 border-amber-500/30 text-amber-400',
  purple: 'from-purple-500/20 border-purple-500/30 text-purple-400',
};

export default function Pillars() {
  const [ref, inView] = useInView();

  return (
    <section id="pillars" className="py-20 px-6">
      <div ref={ref} className={`max-w-5xl mx-auto ${inView ? 'reveal visible' : 'reveal'}`}>
        <p className="eyebrow text-center mb-3">The 5 Pillars</p>
        <h2 className="text-3xl md:text-5xl font-black text-center mb-4 leading-tight">
          Longevity isn't one thing.
        </h2>
        <p className="text-center text-slate-400 max-w-2xl mx-auto mb-12">
          Armor tracks the five interventions proven to extend healthspan.
          Each takes 5-20 minutes. All fit inside a real day.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {PILLARS.map((p) => (
            <div
              key={p.n}
              className={`card relative overflow-hidden group hover:scale-[1.02] transition-transform bg-gradient-to-br ${COLOR_MAP[p.color].split(' ').slice(0, 2).join(' ')} to-transparent`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{p.icon}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pillar {p.n} / 5</span>
              </div>
              <h3 className={`text-lg font-black mb-0.5 ${COLOR_MAP[p.color].split(' ').pop()}`}>{p.title}</h3>
              <p className="text-xs font-semibold text-slate-400 mb-3">{p.sub}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{p.desc}</p>
            </div>
          ))}

          {/* The 5th placeholder: future pillar */}
          <div className="card border-dashed border-white/10 flex items-center justify-center text-center min-h-[180px]">
            <div>
              <p className="text-2xl mb-2 opacity-40">+</p>
              <p className="text-xs text-slate-400">More pillars as research evolves.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
