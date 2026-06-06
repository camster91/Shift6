import { useInView } from '../hooks/useInView';

const SCREENS = [
  { name: 'Today', emoji: '🏠', body: 'Today\'s workout at a glance. Cycle progress, modifiers, habit stack, quick stats — all in one glanceable view.' },
  { name: 'Workout', emoji: '🏋️', body: 'Periodization-aware workout screen. Plate math per side. Rest timer with urgent state at ≤10s. PR detection with confetti + award modal.' },
  { name: 'Progress', emoji: '📊', body: 'Six phase blocks showing your 6-week cycle. Streak ring with 30-day badge. 7-day volume chart. 1RM leaderboard with relative strength bars.' },
  { name: 'Account', emoji: '☁️', body: 'Optional cloud sync. Sign in once, your data lives on every device. Last-write-wins conflict resolution. Logout keeps local data intact.' },
];

export default function Showcase() {
  const [ref, inView] = useInView();

  return (
    <section id="showcase" className="py-20 px-6">
      <div ref={ref} className={`max-w-6xl mx-auto ${inView ? 'reveal visible' : 'reveal'}`}>
        <p className="eyebrow text-center mb-3">Inside Armor</p>
        <h2 className="text-3xl md:text-5xl font-black text-center mb-4 leading-tight">
          Apple-caliber design.<br />
          <span className="text-slate-400">No clutter. No upsells.</span>
        </h2>
        <p className="text-center text-slate-400 max-w-2xl mx-auto mb-12">
          Every screen earns its place. Four primary views — that's it. Information density tuned for
          the gym, not for a sales funnel.
        </p>

        <div className="grid md:grid-cols-2 gap-3">
          {SCREENS.map((s, i) => (
            <div key={i} className="card flex items-start gap-3 group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl shrink-0">
                {s.emoji}
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">{s.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
