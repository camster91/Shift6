import { useState, useEffect } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { useShift6Data } from '../context/Shift6DataContext';
import { EQUIPMENT_TRACKS, SPLIT_DAYS } from '../data/shift6Engine';
import PageHeader from '../components/ui/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';

/* ═══════════════════════════════════════════════════════════
   SHIFT6 ONBOARDING v3.0 — Apple HIG
   One-screen setup. Name + 1RM choice (or skip). No forced track pick.
   The dashboard's track switcher handles per-workout selection.
   ═══════════════════════════════════════════════════════════ */

const DEFAULTS = {
  full_gym: { barbell_squat: 185, bench_press: 135, deadlift: 225 },
  home_gym: { goblet_squat: 95, dumbbell_press: 100, romanian_deadlift: 155 },
};

// Jargon tooltip helper — wraps a term with an (i) icon
function JargonTooltip({ term, definition }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {term}
      <span
        className="armor-press inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold text-[var(--text-tertiary)] bg-[var(--color-surface-1)] cursor-help select-none"
        title={definition}
      >
        i
      </span>
    </span>
  );
}

// Day-of-week pip — a small numbered circle used in the split preview list.
function DayPip({ day }) {
  return (
    <span
      className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
      aria-hidden="true"
    >
      {day}
    </span>
  );
}

export default function Shift6Onboarding() {
  const { completeOnboarding } = useShift6Data();
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
    // "Use both" path (trackId is null): merge defaults from BOTH tracks so the
    // user can switch per-workout from the dashboard without re-entering 1RMs.
    const estimated1RMs = trackId
      ? DEFAULTS[trackId]
      : { ...DEFAULTS.full_gym, ...DEFAULTS.home_gym };
    const eqTrack = trackId || 'full_gym';
    setTimeout(() => {
      completeOnboarding({ equipmentTrack: eqTrack, estimated1RMs, displayName: displayName || 'Athlete' });
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col text-[var(--text-primary)]">
      <div className="flex-1 max-w-lg mx-auto w-full px-6 pt-10 pb-8 flex flex-col">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-3xl" aria-hidden="true">⚔️</span>
            <span className="text-xl font-black tracking-tight text-[var(--text-primary)]">
              <span className="text-[var(--color-accent)]">SHIFT6</span>
            </span>
          </div>
          <PageHeader
            title="Set up in 5 seconds"
            description={<><JargonTooltip term="1RM" definition="your one-rep max — the heaviest weight you can lift once" /> · <JargonTooltip term="MVD" definition="Minimum Viable Day — bodyweight + walk" /> · <JargonTooltip term="CNS" definition="central nervous system — how recovered you feel" /> · <JargonTooltip term="Base" definition="foundation phase — moderate weight, higher reps" /> — pick a starting point or use both tracks. Fine-tune anytime.</>}
          />
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
              className="armor-surface-1 w-full rounded-xl px-4 py-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus-visible:outline-[var(--color-accent)]"
              onKeyDown={e => e.key === 'Enter' && handleCommit(chosenTrack)}
            />
          </div>

          {/* Track choice — optional */}
          <div>
            <p className="armor-text-caption block mb-2">Where will you train most?</p>
            <p className="armor-text-footnote mb-3">You can switch per-workout from the dashboard later.</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(EQUIPMENT_TRACKS).map(t => (
                <Card
                  key={t.id}
                  interactive
                  padded={false}
                  onClick={() => setChosenTrack(chosenTrack === t.id ? null : t.id)}
                  aria-pressed={chosenTrack === t.id}
                >
                  {chosenTrack === t.id && (
                    <Check size={14} className="text-[var(--color-accent)] absolute top-2 right-2" strokeWidth={3} />
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden="true">{t.icon}</span>
                  </div>
                  <p className="text-sm font-bold text-[var(--text-primary)] mt-1.5">{t.label}</p>
                  <p className="armor-text-caption mt-0.5">{t.sublabel}</p>
                </Card>
              ))}
            </div>
            <p className="armor-text-caption mt-3">Don&apos;t worry — you can change this anytime from Settings.</p>
          </div>

          {/* Split preview — for whichever track is chosen, or both if skipped */}
          {chosenTrack && (
            <div className="armor-surface-1 rounded-2xl p-4">
              <p className="armor-text-caption mb-2">Your first week</p>
              <div className="space-y-1.5">
                {SPLIT_DAYS[chosenTrack].slice(0, 5).map(d => (
                  <div key={d.day} className="flex items-center gap-2 text-xs">
                    <DayPip day={d.day} />
                    <span className="text-[var(--text-primary)] flex-1 truncate">{d.name}</span>
                    <span className="text-[var(--text-disabled)] text-[10px] uppercase tracking-wider">
                      {d.type === 'vo2max' ? 'Cardio' : 'Strength'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pinned commit footer — three paths. The "Use both" path is the explicit
          zero-commit option. The two track paths give reasonable defaults. */}
      <div
        className="px-6 pt-4 pb-6"
        style={{
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))',
          background: 'linear-gradient(to top, var(--elevation-0-bg) 70%, transparent)',
        }}
      >
        <div className="max-w-lg mx-auto space-y-2">
          {!chosenTrack && !submitting && (
            <span className="armor-badge armor-badge-accent">Recommended for new users</span>
          )}
          {submitting ? (
            <Button variant="primary" size="lg" icon={<Check size={20} strokeWidth={3} />} className="w-full" disabled>
              Welcome to Shift6
            </Button>
          ) : chosenTrack ? (
            <Button
              variant="primary"
              size="lg"
              onClick={() => handleCommit(chosenTrack)}
              className="w-full"
            >
              {EQUIPMENT_TRACKS[chosenTrack].icon} Begin with {EQUIPMENT_TRACKS[chosenTrack].label} defaults
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              icon={<Sparkles size={20} />}
              onClick={() => handleCommit(chosenTrack)}
              className="w-full"
            >
              Use both — set 1RMs as you go
            </Button>
          )}
          {chosenTrack && !submitting && (
            <button
              onClick={() => handleCommit(null)}
              className="armor-press w-full py-2.5 rounded-xl text-[var(--text-secondary)] text-sm font-medium"
            >
              Or skip — use both tracks
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
