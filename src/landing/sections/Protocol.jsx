import { useInView } from '../hooks/useInView';

export default function Protocol() {
  const [ref, inView] = useInView();
  const weeks = [
    { w: 1, name: 'Base', phase: 'Build volume', sets: 3, reps: 8, pct: '65-70%' },
    { w: 2, name: 'Volume', phase: 'Push higher reps', sets: 4, reps: 8, pct: '70-75%' },
    { w: 3, name: 'Transition', phase: 'Heavier loads', sets: 4, reps: 5, pct: '78-82%' },
    { w: 4, name: 'Heavy', phase: 'Max strength', sets: 4, reps: 3, pct: '83-87%' },
    { w: 5, name: 'Peak', phase: 'Testing single rep', sets: 3, reps: 2, pct: '88-95%' },
    { w: 6, name: 'Deload', phase: 'Recover and reset', sets: 3, reps: 5, pct: '58-62%' },
  ];

  return (
    <section id="protocol" className="py-20 px-6">
      <div ref={ref} className={`max-w-5xl mx-auto ${inView ? 'reveal visible' : 'reveal'}`}>
        <p className="eyebrow text-center mb-3">The Protocol</p>
        <h2 className="text-3xl md:text-5xl font-black text-center mb-4 leading-tight">
          6-week periodization.<br />
          <span className="text-cyan-400">All the math done for you.</span>
        </h2>
        <p className="text-center text-slate-400 max-w-2xl mx-auto mb-12">
          Each week has a clear purpose. Shift6 calculates sets, reps, and weight as a percentage of your 1RM.
          Plus a 5-rep max test on day 1 estimates your baseline — no dangerous max testing.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {weeks.map((w) => (
            <div
              key={w.w}
              className="rounded-xl p-3 bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-cyan-500/30 transition-all"
            >
              <p className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase">Week {w.w}</p>
              <p className="text-sm font-black text-white mt-0.5">{w.name}</p>
              <p className="text-[10px] text-slate-400 mt-1">{w.phase}</p>
              <div className="mt-3 pt-3 border-t border-white/[0.05] space-y-0.5">
                <p className="text-[10px] text-slate-400">{w.sets} × {w.reps} @ {w.pct}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 grid md:grid-cols-3 gap-3">
          {[
            { label: 'Plate Math', desc: 'See exactly which plates load on each side of the bar. Per session.' },
            { label: 'Auto-Rollover', desc: 'After 6 weeks: +5 lbs upper body, +10 lbs lower body. Reset to Week 1.' },
            { label: 'PR Detection', desc: 'Hit a new estimated 1RM? Confetti. Streak bonus. Cycle bonus.' },
          ].map((f, i) => (
            <div key={i} className="card text-center">
              <p className="text-sm font-bold text-cyan-400 mb-1">{f.label}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
