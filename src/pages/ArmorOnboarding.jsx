import { useState, useMemo, useEffect } from 'react';
import { Check, ChevronRight, ChevronLeft, Plus, Minus, Award, Sparkles } from 'lucide-react';
import { useArmorData } from '../context/ArmorDataContext';
import { EQUIPMENT_TRACKS, estimate1RM, SPLIT_DAYS } from '../data/armorEngine';

/* ═══════════════════════════════════════════════════════════
   ARMOR ONBOARDING v2.0 — Apple HIG
   Zero-friction discovery flow. Progressive disclosure.
   ═══════════════════════════════════════════════════════════ */

const TRACK_TEST_EXERCISES = {
  full_gym: [
    { id: 'barbell_squat', name: 'Barbell Squat', bodyPart: 'Legs', icon: '🦵' },
    { id: 'bench_press', name: 'Bench Press', bodyPart: 'Chest', icon: '💪' },
    { id: 'deadlift', name: 'Deadlift', bodyPart: 'Back', icon: '🔙' },
  ],
  home_gym: [
    { id: 'goblet_squat', name: 'Goblet Squat', bodyPart: 'Legs', icon: '🦵' },
    { id: 'dumbbell_press', name: 'DB Bench Press', bodyPart: 'Chest', icon: '💪' },
    { id: 'romanian_deadlift', name: 'DB Romanian DL', bodyPart: 'Back', icon: '🔙' },
  ],
};

export default function ArmorOnboarding() {
  const { completeOnboarding } = useArmorData();
  const [step, setStep] = useState(0);
  const [track, setTrack] = useState('full_gym');
  const [testResults, setTestResults] = useState({});
  const [activeTest, setActiveTest] = useState(null);
  const [testWeight, setTestWeight] = useState(135);
  const [testReps, setTestReps] = useState(5);
  const [displayName, setDisplayName] = useState('');

  const trackTests = TRACK_TEST_EXERCISES[track];
  const [submitting, setSubmitting] = useState(false);

  // Trigger haptic feedback on finishing onboarding
  useEffect(() => {
    if (submitting) {
      try { navigator.vibrate?.([50, 30, 50, 30, 100]); } catch {}
    }
  }, [submitting]);

  const handleSaveTest = () => {
    if (!activeTest) return;
    setTestResults(prev => ({
      ...prev,
      [activeTest.id]: { weight: testWeight, reps: testReps, estimated1RM: estimate1RM(testWeight, testReps) },
    }));
    setActiveTest(null);
  };

  const handleSkipTest = () => {
    const defaults = { barbell_squat: 185, bench_press: 135, deadlift: 225, goblet_squat: 95, dumbbell_press: 100, romanian_deadlift: 155 };
    const r = {};
    trackTests.forEach(t => { r[t.id] = testResults[t.id]?.estimated1RM || defaults[t.id] || 100; });
    setTestResults(r);
    setStep(2);
  };

  const handleFinish = () => {
    if (submitting) return; // prevent double-fire
    setSubmitting(true);
    const all1RMs = {};
    trackTests.forEach(t => { all1RMs[t.id] = testResults[t.id]?.estimated1RM || (testResults[t.id] || 100); });
    if (!all1RMs.barbell_squat && !all1RMs.goblet_squat) {
      const d = track === 'full_gym' ? { barbell_squat: 185, bench_press: 135, deadlift: 225 } : { goblet_squat: 95, dumbbell_press: 100, romanian_deadlift: 155 };
      Object.assign(all1RMs, d);
    }
    // Brief delay so the success state is visible before re-render
    setTimeout(() => {
      completeOnboarding({ equipmentTrack: track, estimated1RMs: all1RMs, displayName: displayName || 'Athlete' });
    }, 600);
  };

  const bg = 'var(--elevation-0-bg)';

  /* ── STEP 0: TRACK ────────────────────────────────────────── */
  if (step === 0) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: bg, color: 'var(--text-primary)' }}>
        <div className="flex-1 max-w-lg mx-auto w-full px-6 pt-12 pb-6 flex flex-col">
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-8">
              <span style={{ fontSize: '28px' }}>⚔️</span>
              <span className="text-xl font-black tracking-tight"><span className="text-cyan-400">ARMOR</span></span>
            </div>
            <h1 className="armor-text-large-title mb-2">Choose Your Track</h1>
            <p className="armor-text-body" style={{ color: 'var(--text-secondary)' }}>
              This determines your 5-day split, progression math, and equipment. Switch anytime.
            </p>
          </div>

          <div className="flex-1 space-y-3">
            {Object.values(EQUIPMENT_TRACKS).map(t => {
              const selected = track === t.id;
              const previewDays = SPLIT_DAYS[t.id]?.slice(0, 3) || [];
              return (
                <button key={t.id} onClick={() => setTrack(t.id)}
                  className="armor-press w-full text-left p-5 rounded-2xl transition-all relative overflow-hidden"
                  style={{
                    background: selected ? 'rgba(6,182,212,0.08)' : 'var(--elevation-1-bg)',
                    boxShadow: selected ? '0 0 0 1.5px rgba(6,182,212,0.3), 0 4px 16px rgba(0,0,0,0.3)' : 'var(--elevation-1-shadow)',
                  }}>
                  {selected && <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />}
                  <div className="flex items-start gap-3 mb-3 relative z-10">
                    <span style={{ fontSize: '24px' }}>{t.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-white">{t.label}</h3>
                        {selected && <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center"><Check size={11} className="text-white" strokeWidth={3} /></div>}
                      </div>
                      <p className="text-xs text-slate-500">{t.sublabel}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 relative z-10">
                    {previewDays.map((d, i) => (
                      <span key={i} className="px-2 py-1 rounded-full bg-white/[0.04] text-[10px] text-slate-400 font-medium">{d.name}</span>
                    ))}
                    <span className="px-2 py-1 rounded-full bg-white/[0.04] text-[10px] text-slate-600 font-medium">+2</span>
                  </div>
                </button>
              );
            })}
          </div>

          <button onClick={() => setStep(1)}
            className="armor-press w-full py-4 rounded-2xl text-white font-bold text-base mt-6 flex items-center justify-center gap-2"
            style={{ background: 'var(--color-accent)' }}>
            Continue <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  /* ── STEP 1: BASELINE TEST ────────────────────────────────── */
  if (step === 1) {
    if (activeTest) {
      const ex = trackTests.find(t => t.id === activeTest.id);
      const estimated = estimate1RM(testWeight, testReps);
      return (
        <div className="min-h-screen flex flex-col" style={{ background: bg, color: 'var(--text-primary)' }}>
          <div className="flex-1 max-w-lg mx-auto w-full px-6 pt-8 pb-6 flex flex-col">
            <button onClick={() => setActiveTest(null)}
              className="text-xs font-semibold text-slate-500 mb-4 flex items-center gap-1 self-start">
              <ChevronLeft size={14} /> Back
            </button>
            <h2 className="text-xl font-black text-white mb-1">{ex.name}</h2>
            <p className="armor-text-footnote mb-8" style={{ color: 'var(--text-tertiary)' }}>
              Find a weight for 5 challenging but clean reps.
            </p>

            <div className="flex-1 flex flex-col items-center justify-center space-y-8">
              {/* Weight */}
              <div className="text-center">
                <p className="armor-text-caption mb-3">Weight</p>
                <div className="flex items-center gap-4">
                  <button onClick={() => setTestWeight(w => Math.max(5, w - 5))}
                    className="armor-press w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: 'var(--elevation-1-bg)' }}>
                    <Minus size={22} className="text-slate-400" />
                  </button>
                  <div className="text-center min-w-[110px]">
                    <span className="text-5xl font-black text-white tabular-nums">{testWeight}</span>
                    <p className="text-xs text-slate-600 mt-1 font-medium">lbs</p>
                  </div>
                  <button onClick={() => setTestWeight(w => w + 5)}
                    className="armor-press w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: 'var(--elevation-1-bg)' }}>
                    <Plus size={22} className="text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Weight presets */}
              <div className="flex flex-wrap gap-2 justify-center">
                {[45, 95, 135, 185, 225, 275, 315].map(w => (
                  <button key={w} onClick={() => setTestWeight(w)}
                    className={`armor-press px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      testWeight === w ? 'bg-cyan-500 text-white' : 'text-slate-400'
                    }`} style={{ background: testWeight === w ? 'var(--color-accent)' : 'var(--elevation-1-bg)' }}>
                    {w}
                  </button>
                ))}
              </div>

              <div className="w-full h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />

              {/* Reps */}
              <div className="text-center">
                <p className="armor-text-caption mb-3">Reps Completed</p>
                <div className="flex items-center gap-4">
                  <button onClick={() => setTestReps(r => Math.max(1, r - 1))}
                    className="armor-press w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: 'var(--elevation-1-bg)' }}>
                    <Minus size={22} className="text-slate-400" />
                  </button>
                  <div className="text-center min-w-[80px]">
                    <span className="text-5xl font-black text-cyan-400 tabular-nums">{testReps}</span>
                    <p className="text-xs text-slate-600 mt-1 font-medium">reps</p>
                  </div>
                  <button onClick={() => setTestReps(r => r + 1)}
                    className="armor-press w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: 'var(--elevation-1-bg)' }}>
                    <Plus size={22} className="text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Epley result */}
              <div className="w-full rounded-2xl p-5 flex gap-3 items-start"
                style={{ background: 'rgba(6,182,212,0.06)' }}>
                <Award size={20} className="text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-white">
                    Estimated 1RM: <span className="text-cyan-400 text-lg">{estimated} lbs</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {testWeight} × (1 + 0.0333 × {testReps}) = {estimated}
                  </p>
                </div>
              </div>
            </div>

            <button onClick={handleSaveTest}
              className="armor-press w-full py-4 rounded-2xl text-white font-bold text-base mt-6"
              style={{ background: 'var(--color-accent)' }}>
              Save & Continue
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col" style={{ background: bg, color: 'var(--text-primary)' }}>
        <div className="flex-1 max-w-lg mx-auto w-full px-6 pt-8 pb-6 flex flex-col">
          <button onClick={() => setStep(0)}
            className="text-xs font-semibold text-slate-500 mb-4 flex items-center gap-1 self-start">
            <ChevronLeft size={14} /> Back
          </button>
          <h1 className="armor-text-large-title mb-1">Find Your Baseline</h1>
          <p className="armor-text-footnote mb-8" style={{ color: 'var(--text-tertiary)' }}>
            For each lift, find a weight for <strong className="text-white">5 clean reps</strong>. No max testing.
          </p>

          <div className="flex-1 space-y-3">
            {trackTests.map(ex => {
              const r = testResults[ex.id];
              const done = !!r;
              return (
                <button key={ex.id} onClick={() => { setActiveTest(ex); setTestWeight(r?.weight || 135); setTestReps(r?.reps || 5); }}
                  className="armor-press w-full text-left p-4 rounded-2xl transition-all"
                  style={{ background: done ? 'rgba(16,185,129,0.06)' : 'var(--elevation-1-bg)', boxShadow: done ? '0 0 0 1px rgba(16,185,129,0.2)' : 'var(--elevation-1-shadow)' }}>
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: '24px' }}>{ex.icon}</span>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-white">{ex.name}</h3>
                      <p className="text-[11px] text-slate-600">{ex.bodyPart}</p>
                    </div>
                    {done ? (
                      <div className="text-right">
                        <span className="text-emerald-400 font-bold text-lg">{r.estimated1RM}</span>
                        <span className="text-emerald-500/60 text-xs ml-1">lbs</span>
                        <div className="flex items-center gap-1 justify-end mt-0.5">
                          <Check size={11} className="text-emerald-400" strokeWidth={3} />
                          <span className="text-[10px] text-emerald-500">{r.weight}×{r.reps}</span>
                        </div>
                      </div>
                    ) : <ChevronRight size={18} className="text-slate-600" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-3 mt-6">
            {Object.keys(testResults).length === trackTests.length ? (
              <button onClick={() => setStep(2)}
                className="armor-press w-full py-4 rounded-2xl text-white font-bold text-base"
                style={{ background: 'var(--color-accent)' }}>
                Continue — All Lifts Tested
              </button>
            ) : (
              <button onClick={handleSkipTest}
                className="armor-press w-full py-4 rounded-2xl text-slate-400 font-bold text-sm"
                style={{ background: 'var(--elevation-1-bg)' }}>
                Skip — Use Conservative Defaults
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── STEP 2: READY ────────────────────────────────────────── */
  const all1RMs = {};
  trackTests.forEach(t => { all1RMs[t.id] = testResults[t.id]?.estimated1RM || (testResults[t.id] || 100); });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: bg, color: 'var(--text-primary)' }}>
      <div className="flex-1 max-w-lg mx-auto w-full px-6 pt-8 pb-6 flex flex-col">
        <h1 className="armor-text-large-title mb-1">You're Ready</h1>
        <p className="armor-text-footnote mb-8" style={{ color: 'var(--text-tertiary)' }}>
          Week 1 Day 1 starts now. We handle the plate math — you just show up.
        </p>

        <div className="flex-1 space-y-6">
          <div>
            <label className="armor-text-caption block mb-2">Your Name</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              placeholder="Enter your name..."
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-700 outline-none"
              style={{ background: 'var(--elevation-1-bg)' }} />
          </div>

          <div>
            <p className="armor-text-caption mb-3">Estimated 1RMs</p>
            <div className="space-y-1.5">
              {trackTests.map(ex => (
                <div key={ex.id} className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: 'var(--elevation-1-bg)' }}>
                  <div className="flex items-center gap-2">
                    <span>{ex.icon}</span>
                    <span className="text-sm font-bold text-white">{ex.name}</span>
                  </div>
                  <span className="text-sm font-black text-cyan-400 tabular-nums">{all1RMs[ex.id] || '—'} lbs</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: 'var(--elevation-1-bg)' }}>
            <p className="armor-text-caption mb-3">Your First Week</p>
            <div className="space-y-2">
              {SPLIT_DAYS[track].map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: 'rgba(6,182,212,0.12)', color: 'var(--color-accent)' }}>{d.day}</span>
                  <span className="text-slate-300 text-xs">{d.name}</span>
                  <span className="text-slate-700">— {d.type === 'vo2max' ? 'Cardio' : 'Strength'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleFinish}
          disabled={submitting}
          className="armor-press w-full py-5 rounded-2xl text-white font-black text-lg mt-6 flex items-center justify-center gap-2 transition-all"
          style={{
            background: submitting ? 'var(--color-success)' : 'linear-gradient(135deg, var(--color-accent), #3b82f6)',
            boxShadow: submitting ? '0 0 24px rgba(16,185,129,0.5)' : 'none',
            opacity: submitting ? 0.9 : 1,
          }}>
          {submitting ? <><Check size={20} strokeWidth={3} /> Entering Armor...</> : <>⚔️ Begin Armor Protocol</>}
        </button>
      </div>
    </div>
  );
}
