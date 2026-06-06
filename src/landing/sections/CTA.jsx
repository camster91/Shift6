import { useInView } from '../hooks/useInView';
import { Smartphone, Watch, Apple } from 'lucide-react';

export default function CTA() {
  const [ref, inView] = useInView();

  return (
    <section id="download" className="py-24 px-6 relative overflow-hidden">
      <div className="orb" style={{ width: 600, height: 600, background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.25 }} />

      <div ref={ref} className={`max-w-3xl mx-auto text-center relative z-10 ${inView ? 'reveal visible' : 'reveal'}`}>
        <p className="eyebrow mb-3">Start Today</p>
        <h2 className="text-4xl md:text-6xl font-black mb-4 leading-[1.05] tracking-tight">
          Your next workout is <span className="gradient-text">15 minutes</span> away.
        </h2>
        <p className="text-lg text-slate-400 mb-8 max-w-xl mx-auto">
          Free forever. No subscription. No data harvesting. Your training data lives on your phone —
          cloud sync is optional and end-to-end yours.
        </p>

        {/* Store badges */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <a href="#" className="inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-white text-slate-950 font-bold transition-all hover:scale-105 active:scale-95">
            <Apple size={24} fill="currentColor" />
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-wider opacity-70 leading-none mb-0.5">Download on the</p>
              <p className="text-base leading-none">App Store</p>
            </div>
          </a>
          <a href="#" className="inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-white font-bold transition-all hover:scale-105 active:scale-95">
            <svg width="20" height="22" viewBox="0 0 24 24" fill="currentColor" className="ml-1">
              <path d="M3 2.5l13 9.5-13 9.5V2.5z" opacity="0.7"/>
              <path d="M3 2.5v19l13-9.5L3 2.5z" opacity="0.85"/>
            </svg>
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-wider opacity-70 leading-none mb-0.5">Get it on</p>
              <p className="text-base leading-none">Google Play</p>
            </div>
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 mb-12">
          <span className="flex items-center gap-1.5">
            <Watch size={14} className="text-cyan-400" /> Apple Watch
          </span>
          <span className="flex items-center gap-1.5">
            <Smartphone size={14} className="text-cyan-400" /> iOS 15+ / Android 9+
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span> Works offline
          </span>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 max-w-md mx-auto">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-2">No download yet? Try the PWA:</p>
          <a href="https://getshift6.com" className="text-cyan-400 font-semibold text-sm hover:text-cyan-300">
            Open getshift6.com in your browser →
          </a>
          <p className="text-[10px] text-slate-400 mt-1.5">Add to Home Screen for full PWA experience.</p>
        </div>
      </div>
    </section>
  );
}
