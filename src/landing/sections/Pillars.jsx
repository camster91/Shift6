import { useInView } from '../hooks/useInView';

const PILLARS = [
  {
    n: 1,
    icon: '🦵',
    title: 'Strength',
    sub: 'Periodized 6-week cycles',
    desc: 'Heavy compound lifts on a planned progression. Shift6 calculates your sets, reps, and weights from your estimated 1RM — no spreadsheets, no guesswork.',
    color: 'cyan',
  },
  {
    n: 2,
    icon: '🫀',
    title: 'VO₂ Max',
    sub: 'Norwegian 4×4 intervals',
    desc: '4 rounds of 4-min work at 85-95% max HR, with 3-min active rest. The single best predictor of all-cause mortality — and the lowest time-cost of any longevity intervention.',
    color: 'rose',
  },
];

const COLOR_MAP = {
  rose: 'from-rose-500/20 border-rose-500/30 text-rose-400',
  cyan: 'from-cyan-500/20 border-cyan-500/30 text-cyan-400',
  emerald: 'from-emerald-500/20 border-emerald-500/30 text-emerald-400',
  amber: 'from-amber-500/20 border-amber-500/30 text-amber-400',
  purple: 'from-purple-500/20 border-purple-500/30 text-purple-400',
};

const HABITS = [
  { icon: '⚖️', label: 'Balance drill', sub: 'Single-leg, eyes closed, 2–3 min/leg' },
  { icon: '🚶', label: 'Lunch walk', sub: '10 min post-lunch, non-negotiable' },
  { icon: '🚶', label: 'Dinner walk', sub: '10 min post-dinner, blunts glucose spike' },
  { icon: '🧘', label: 'Evening floor work', sub: '5 min hips, hams, thoracic spine' },
];

export default function Pillars() {
  const [ref, inView] = useInView();

  return (
    <section id="pillars" className="py-20 px-6">
      <div ref={ref} className={`max-w-5xl mx-auto ${inView ? 'reveal visible' : 'reveal'}`}>
        <p className="eyebrow text-center mb-3">2 Strength Pillars</p>
        <h2 className="text-3xl md:text-5xl font-black text-center mb-4 leading-tight">
          Two interventions, maximum ROI.
        </h2>
        <p className="text-center text-slate-400 max-w-2xl mx-auto mb-12">
          Everything in Shift6 serves these two pillars. Strength and VO₂ Max are the only
          interventions with strong evidence for mortality risk reduction independent of each other.
        </p>

        <div className="grid md:grid-cols-2 gap-3 mb-16">
          {PILLARS.map((p) => (
            <div
              key={p.n}
              className={`card relative overflow-hidden group hover:scale-[1.02] transition-transform bg-gradient-to-br ${COLOR_MAP[p.color].split(' ').slice(0, 2).join(' ')} to-transparent`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{p.icon}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pillar {p.n} / 2</span>
              </div>
              <h3 className={`text-lg font-black mb-0.5 ${COLOR_MAP[p.color].split(' ').pop()}`}>{p.title}</h3>
              <p className="text-xs font-semibold text-slate-400 mb-3">{p.sub}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        <p className="eyebrow text-center mb-3">4 Daily Longevity Habits</p>
        <p className="text-center text-slate-400 max-w-2xl mx-auto mb-8">
          Daily stackable habits that complement the pillars. Each takes 5–20 minutes.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {HABITS.map((h, i) => (
            <div key={i} className="card border border-white/[0.06]">
              <span className="text-xl mb-2 block">{h.icon}</span>
              <p className="text-sm font-bold text-slate-200 mb-1">{h.label}</p>
              <p className="text-xs text-slate-400">{h.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}