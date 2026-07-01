import { useInView } from '../hooks/useInView';

const PROTOCOLS = [
  {
    emoji: '🛡️',
    name: 'Minimum Viable Day',
    short: 'No gym? No problem.',
    desc: '100 push-ups (accumulated). 15-min walk. 5-min mobility. Streak protected. The day counts as a win — and your CNS gets the recovery it needs.',
    accent: 'amber',
  },
  {
    emoji: '⏱️',
    name: '20-Minute Window',
    short: 'In a meeting crunch.',
    desc: 'Shift6 strips your workout to the essential primary lift or one VO₂ block. Accessories and warm-up sets are skipped. Plate math stays correct.',
    accent: 'cyan',
  },
  {
    emoji: '😴',
    name: 'High CNS Fatigue',
    short: 'After a brutal weekend.',
    desc: 'Tired, stressed, poor sleep. Auto-downgrades your primary compound to 60% 1RM and shifts the rep range to hypertrophy. Protect the central nervous system.',
    accent: 'rose',
  },
  {
    emoji: '🍝',
    name: 'Heavy Meal',
    short: 'Pasta night happened.',
    desc: 'Extends the post-dinner walk from 10 to 20 minutes. Blunts the glucose spike. The carb wasn&apos;t the problem — the sedentary 4 hours after was.',
    accent: 'emerald',
  },
  {
    emoji: '✈️',
    name: 'Travel Mode',
    short: 'In a hotel, on a plane.',
    desc: 'Progression is frozen. Bodyweight substitutions activate. Habits, streak, and tracking continue. You don&apos;t come back to "wherever I left off" — you come back to a system that traveled with you.',
    accent: 'purple',
  },
];

const ACCENT = {
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export default function Contingency() {
  const [ref, inView] = useInView();

  return (
    <section id="contingency" className="py-20 px-6">
      <div ref={ref} className={`max-w-5xl mx-auto ${inView ? 'reveal visible' : 'reveal'}`}>
        <p className="eyebrow text-center mb-3">Contingency Protocols</p>
        <h2 className="text-3xl md:text-5xl font-black text-center mb-4 leading-tight">
          Built for the days that didn&apos;t go to plan.
        </h2>
        <p className="text-center text-slate-400 max-w-2xl mx-auto mb-12">
          Most apps assume you&apos;re going to show up. Shift6 assumes you&apos;ll show up most days,
          and on the others — it&apos;ll meet you where you are.
        </p>

        <div className="space-y-3">
          {PROTOCOLS.map((p) => (
              <div
                key={p.name}
                className="card flex items-start gap-4 hover:bg-white/[0.05] transition-colors"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-2xl border ${ACCENT[p.accent]}`}>
                  {p.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <h3 className="text-base font-bold text-white">{p.name}</h3>
                    <span className="text-[10px] text-slate-400 font-medium">{p.short}</span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">{p.desc}</p>
                </div>
              </div>
          ))}
        </div>
      </div>
    </section>
  );
}