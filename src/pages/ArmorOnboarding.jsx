import { useState, useEffect } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { useArmorData } from '../context/ArmorDataContext';
import { EQUIPMENT_TRACKS, SPLIT_DAYS } from '../data/armorEngine';

/* ═══════════════════════════════════════════════════════════
   ARMOR ONBOARDING v3.0 — Apple HIG
   One-screen setup. Name + 1RM choice (or skip). No forced track pick.
   The dashboard's track switcher handles per-workout selection.
   ═══════════════════════════════════════════════════════════ */

const DEFAULTS = {
  full_gym: { barbell_squat: 185, bench_press: 135, deadlift: 225 },
  home_gym: { goblet_squat: 95, dumbbell_press: 100, romanian_deadlift: 155 },
};

export default function ArmorOnboarding() {
  const { completeOnboarding } = useArmorData();
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [chosenTrack, setChosenTrack] = useState(null);

  // Trigger haptic on commit
  useEffect(() => {
    if (submitting) {
      try { navigator.vibrate?.([50, 30, 50, 30, 100]); } catch {
        // Vibration API not available
      }
    }
  }, [submitting]);

  // Three paths: skip entirely (use both, no 1RMs), commit to full_gym (defaults),
  // commit to home_gym (defaults). The dashboard's per-workout switcher + per-track
  // 1RM editor means the user's choice is never a hard lock.
  const handleCommit = (trackId) => {
    if (submitting) return;
    setSubmitting(true);
    const estimated1RMs = trackId ? DEFAULTS[trackId] : {};
    setTimeout(() => {
      completeOnboarding({ equipmentTrack: trackId || 'full_gym', estimated1RMs, displayName: displayName || 'Athlete' });
    }, 600);
  };

  const bg = 'var(--elevation-0-bg)';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: bg, color: 'var(--text-primary)' }}>
      <div className="flex-1 max-w-lg mx-auto w-full px-6 pt-10 pb-8 flex flex-col">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <span style={{ fontSize: '28px' }}>⚔️</span>
            <span className="text-xl font-black tracking-tight"><span className="text-cyan-400">ARMOR</span></span>
          </div>
          <h1 className="armor-text-large-title mb-2">Set up in 5 seconds</h1>
          <p className="armor-text-body" style={{ color: 'var(--text-secondary)' }}>
            Name (or skip), pick a starting 1RM or use both tracks — you can fine-tune everything later.
          </p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-6">
          {/* Name */}
          <div>
            <label className="armor-text-caption block mb-2">Your name (optional)</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Athlete"
              autoFocus
              className="w-full rounded-xl px-4 py-3 text-base text-white placeholder:text-slate-700 outline-none"
              style={{ background: 'var(--elevation-1-bg)' }}
              onKeyDown={e => e.key === 'Enter' && handleCommit(chosenTrack)}
            />
          </div>

          {/* Track choice — optional */}
          <div>
            <p className="armor-text-caption block mb-2">Where will you train most?</p>
            <p className="text-[11px] text-slate-600 mb-3">You can switch per-workout from the dashboard later.</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(EQUIPMENT_TRACKS).map(t => (
                <button
                  key={t.id}
                  onClick={() => setChosenTrack(chosenTrack === t.id ? null : t.id)}
                  className={`armor-press text-left p-3 rounded-xl transition-all relative ${chosenTrack === t.id ? 'ring-2 ring-cyan-400/40' : ''}`}
                  style={{
                    background: chosenTrack === t.id ? 'rgba(6,182,212,0.04)' : 'var(--elevation-1-bg)',
                    boxShadow: chosenTrack === t.id ? '0 0 0 1.5px rgba(6,182,212,0.3), var(--elevation-1-shadow)' : 'var(--elevation-1-shadow)',
                  }}
                >
                  {chosenTrack === t.id && (
                    <Check size={14} className="text-cyan-400 absolute top-2 right-2" strokeWidth={3} />
                  )}
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '20px' }}>{t.icon}</span>
                  </div>
                  <p className="text-sm font-bold text-white mt-1.5">{t.label}</p>
                  <p className="text-[10px] text-slate-500">{t.sublabel}</p>
                </button>
              ))}
            </div>
            <p className="armor-text-caption mt-3" style={{ color: 'var(--text-tertiary)' }}>Don&apos;t worry — you can change this anytime from Settings.</p>
          </div>

          {/* Split preview — for whichever track is chosen, or both if skipped */}
          {chosenTrack && (
            <div className="rounded-2xl p-4" style={{ background: 'var(--elevation-1-bg)' }}>
              <p className="armor-text-caption mb-2">Your first week</p>
              <div className="space-y-1.5">
                {SPLIT_DAYS[chosenTrack].slice(0, 5).map(d => (
                  <div key={d.day} className="flex items-center gap-2 text-xs">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ background: 'rgba(6,182,212,0.12)', color: 'var(--color-accent)' }}>{d.day}</span>
                    <span className="text-slate-300 flex-1 truncate">{d.name}</span>
                    <span className="text-slate-700 text-[10px]">{d.type === 'vo2max' ? 'Cardio' : 'Strength'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pinned commit footer — three paths. The "Use both" path is the explicit
          zero-commit option. The two track paths give reasonable defaults. */}
      <div className="px-6 pt-4 pb-6"
        style={{
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))',
          background: 'linear-gradient(to top, var(--elevation-0-bg) 70%, transparent)',
        }}>
        <div className="max-w-lg mx-auto space-y-2">
          {!chosenTrack && !submitting && (
            <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold">✨ Recommended for new users</span>
          )}
          <button
            onClick={() => handleCommit(chosenTrack)}
            disabled={submitting}
            className="armor-press w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-80"
            style={{
              background: submitting
                ? 'var(--color-success)'
                : (chosenTrack ? 'var(--color-accent)' : 'linear-gradient(135deg, var(--color-accent), #3b82f6)'),
              boxShadow: submitting ? '0 0 24px rgba(16,185,129,0.5)' : 'none',
            }}
          >
            {submitting
              ? <><Check size={20} strokeWidth={3} /> Welcome to Armor</>
              : chosenTrack
                ? <>{EQUIPMENT_TRACKS[chosenTrack].icon} Begin with {EQUIPMENT_TRACKS[chosenTrack].label} defaults</>
                : <><Sparkles size={18} /> Use both — set 1RMs as you go</>}
          </button>
          {chosenTrack && !submitting && (
            <button
              onClick={() => handleCommit(null)}
              className="armor-press w-full py-2.5 rounded-xl text-slate-500 text-sm font-medium"
            >
              Or skip — use both tracks
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
