import { useInView } from '../hooks/useInView';
import { X } from 'lucide-react';

export default function Problem() {
  const [ref, inView] = useInView();

  return (
    <section className="py-20 px-6">
      <div ref={ref} className={`max-w-4xl mx-auto ${inView ? 'reveal visible' : 'reveal'}`}>
        <p className="eyebrow text-center mb-3">The Problem</p>
        <h2 className="text-3xl md:text-5xl font-black text-center mb-12 leading-tight">
          Fitness apps assume you have time.
          <br />
          <span className="text-slate-400">You don't.</span>
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          {[
            { icon: '📅', title: 'Plans built for a 90-minute window', sub: 'Reality: 20 minutes between meetings.' },
            { icon: '💔', title: 'Skipped day = broken streak', sub: 'Discipline becomes guilt. Guilt becomes quitting.' },
            { icon: '🤕', title: 'Injuries from "no days off" thinking', sub: 'No CNS fatigue awareness. No deload logic.' },
            { icon: '🌍', title: 'Travel kills the program', sub: 'Hotel gym? No gym? Plan assumes you\'re home.' },
          ].map((p, i) => (
            <div key={i} className="card flex items-start gap-3 group hover:bg-white/[0.05] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-xl shrink-0">
                {p.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  {p.title}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">{p.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-slate-400 mt-10 text-sm max-w-xl mx-auto">
          Other apps treat real life as an edge case. Armor treats it as <span className="text-cyan-400 font-bold">the default</span>.
        </p>
      </div>
    </section>
  );
}
