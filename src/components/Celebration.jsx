import { useEffect, useState } from 'react';
import { X, Sparkles, Check } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   ARMOR CELEBRATIONS — PR detection + confetti + awards
   ═══════════════════════════════════════════════════════════ */

const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];

function ConfettiBurst({ count = 40 }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    const arr = Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      drift: (Math.random() - 0.5) * 200,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
    }));
    setPieces(arr);
  }, [count]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      {pieces.map(p => (
        <span
          key={p.id}
          className="armor-confetti"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            '--drift': `${p.drift}px`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function AwardModal({ achievement, onDismiss }) {
  if (!achievement) return null;
  const config = {
    pr: { icon: '🏆', title: 'New Personal Record', sub: 'You beat your best.' },
    cycle_complete: { icon: '🎯', title: '6-Week Cycle Complete', sub: 'Progression applied. Onward.' },
    pr_set: { icon: '💪', title: 'Strong Set', sub: 'Reps matched or beat your record.' },
  }[achievement] || { icon: '🎉', title: 'Nice', sub: '' };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)' }}
      onClick={onDismiss}>
      <div className="armor-surface-3 p-8 text-center max-w-xs w-full armor-spring-in"
        onClick={e => e.stopPropagation()}>
        <div className="armor-pr-pulse mx-auto mb-4" style={{ fontSize: '64px', width: 'fit-content' }}>
          {config.icon}
        </div>
        <h2 className="armor-text-title text-white mb-1">{config.title}</h2>
        <p className="armor-text-footnote mb-6">{config.sub}</p>
        <button onClick={onDismiss}
          className="armor-press w-full py-3 rounded-2xl text-white font-bold"
          style={{ background: 'var(--color-accent)' }}>
          <Sparkles size={16} className="inline mr-2" /> Continue
        </button>
      </div>
    </div>
  );
}

function Toast({ message, sub, onDismiss, duration = 3000 }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [onDismiss, duration]);

  return (
    <div className="fixed top-4 left-4 right-4 max-w-sm mx-auto z-[80] armor-toast-in">
      <div className="armor-surface-3 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(16,185,129,0.2)' }}>
          <Check size={14} className="text-emerald-400" strokeWidth={3} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">{message}</p>
          {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
        </div>
        <button onClick={onDismiss}
          className="armor-press p-1">
          <X size={14} className="text-slate-500" />
        </button>
      </div>
    </div>
  );
}

export { ConfettiBurst, AwardModal, Toast };
