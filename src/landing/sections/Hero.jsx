import { useInView } from '../hooks/useInView';
import { ArrowRight, Smartphone } from 'lucide-react';

export default function Hero() {
  const [ref, inView] = useInView();

  return (
    <section id="top" className="relative pt-32 pb-20 px-6">
      <div ref={ref} className={`max-w-6xl mx-auto text-center ${inView ? 'reveal visible' : 'reveal'}`}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-bold text-cyan-400 tracking-wide">v3.0 — Apple HIG redesign</span>
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tight mb-6">
          Train through
          <br />
          <span className="gradient-text">the chaos.</span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          The fitness app for professionals whose schedule doesn&apos;t respect their workout.
          6-week periodization, plate math, and contingency protocols that bend so you don&apos;t break.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
          <a href="#download" className="btn-primary">
            <Smartphone size={18} /> Download for iOS & Android
            <ArrowRight size={18} />
          </a>
          <a href="#protocol" className="btn-secondary">
            See the protocol
          </a>
        </div>

        {/* Trust strip */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span> Free forever
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span> Local-first, optional cloud sync
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span> No ads, no tracking
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span> Apple Watch ready
          </span>
        </div>
      </div>

      {/* Hero phone mockup */}
      <div className="max-w-md mx-auto mt-16">
        <PhoneMockup />
      </div>
    </section>
  );
}

function PhoneMockup() {
  return (
    <div className="phone-frame">
      <div className="phone-screen relative">
        <div className="phone-notch" />
        <div className="p-5 pt-12 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Good morning, Cam</p>
              <p className="text-xl font-black"><span className="text-cyan-400">Shift6</span></p>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/10">
              <span className="text-[10px] font-bold text-orange-400">🔥 4</span>
            </div>
          </div>

          {/* Cycle progress */}
          <div className="rounded-xl p-3 bg-white/[0.03] border border-white/[0.05]">
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <span className="text-slate-400 uppercase tracking-wider">Cycle 3 · Week 3</span>
              <span className="text-cyan-400 font-bold">Transition</span>
            </div>
            <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full w-[42%] rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" />
            </div>
          </div>

          {/* Workout card */}
          <div className="rounded-xl p-4 relative overflow-hidden" style={{ background: 'rgba(6,182,212,0.04)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
            <div className="flex items-center gap-3 relative z-10">
              <span className="text-2xl">🏋️</span>
              <div>
                <p className="text-sm font-bold text-white">Heavy Squats</p>
                <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Strength · Transition</p>
              </div>
            </div>
            <div className="mt-3 bg-white/[0.04] rounded-lg p-3 flex items-end justify-between relative z-10">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Primary Lift</p>
                <p className="text-sm font-bold text-white capitalize">Barbell Squat</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-cyan-400 tabular-nums">215</p>
                <p className="text-[9px] text-slate-400">3×8 @ 78%</p>
              </div>
            </div>
          </div>

          {/* Habits */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold px-1">Daily Habits</p>
            {[
              { name: 'Single-Leg Stands', time: '3m', done: true },
              { name: 'Lunch Walk', time: '10m', done: true },
              { name: 'Post-Dinner Walk', time: '10m', done: false },
              { name: 'Evening Floor Work', time: '5m', done: false },
            ].map((h, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02]">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${h.done ? 'bg-emerald-500' : 'bg-white/[0.06]'}`}>
                  {h.done && <span className="text-white text-[8px]">✓</span>}
                </div>
                <span className={`text-xs flex-1 ${h.done ? 'text-emerald-400' : 'text-slate-300'}`}>{h.name}</span>
                <span className="text-[10px] text-slate-400 font-semibold">{h.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
