import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, Check, X, ChevronRight } from 'lucide-react';
import { useShift6Data } from '../context/Shift6DataContext';
import {
  getTodaysWorkout, VO2MAX_PROTOCOL, getWeekConfig, SPLIT_DAYS
} from '../data/shift6Engine';
import { ConfettiBurst, AwardModal } from '../components/Celebration';
import PlateVisualizer from '../components/PlateVisualizer';
import ExerciseIllustration from '../components/ExerciseIllustration';
import { usePRDetection } from '../hooks/usePRDetection';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

/* ── Inner error boundary for the workout session ─────────────── */
class WorkoutErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null, stack: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) {
    console.error('[WorkoutErrorBoundary CAUGHT]', error?.message || String(error), error?.stack?.slice(0, 800));
    this.setState({ stack: info?.componentStack?.slice(0, 1500) || null });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col flex-1 px-6 pt-4 text-center max-w-sm mx-auto w-full items-center justify-center space-y-4 p-4">
          <p className="text-[var(--text-secondary)] text-sm">Something went wrong in this set.</p>
          <p className="text-[var(--color-cardio)] text-xs font-mono break-all">{(this.state.error?.message || String(this.state.error || 'unknown')).slice(0, 300)}</p>
          {this.state.stack && (
            <pre className="text-[9px] text-[var(--text-disabled)] text-left max-h-40 overflow-y-auto whitespace-pre-wrap break-all">{this.state.stack}</pre>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null, stack: null })}
            className="px-4 py-2 rounded-xl bg-[var(--color-surface-1)] text-[var(--text-primary)] text-sm font-semibold"
          >
            Try again
          </button>
          <button
            onClick={() => this.props.onSkip?.()}
            className="px-4 py-2 rounded-xl bg-[var(--color-accent-muted)] text-[var(--color-accent)] text-sm font-semibold"
          >
            Skip Set
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ═══════════════════════════════════════════════════════════
   SHIFT6 WORKOUT SESSION v2.0 — Apple HIG
   Haptic map. Spring animations. PR detection. Confetti.
   ═══════════════════════════════════════════════════════════ */

const HAPTIC = {
  // Vibration is optional; suppress no-empty since failure is non-actionable
   
  light: () => { try { navigator.vibrate?.(10); } catch {} },
   
  medium: () => { try { navigator.vibrate?.(20); } catch {} },
   
  heavy: () => { try { navigator.vibrate?.(100); } catch {} },
   
  success: () => { try { navigator.vibrate?.([50, 30, 100]); } catch {} },
   
  warning: () => { try { navigator.vibrate?.([200, 100, 200]); } catch {} },
};

function useTimer(initialSeconds) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  const start = useCallback(() => {
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          HAPTIC.warning();
          return 0;
        }
        if (prev === 10 || prev === 5 || prev === 3) HAPTIC.light();
        return prev - 1;
      });
    }, 1000);
  }, []);

  const pause = useCallback(() => { setRunning(false); clearInterval(intervalRef.current); }, []);
  const reset = useCallback((s) => { setRunning(false); clearInterval(intervalRef.current); setTimeLeft(s); }, []);
  useEffect(() => () => clearInterval(intervalRef.current), []);
  const addTime = useCallback((s) => { setTimeLeft(prev => Math.max(1, prev + s)); }, []);
  return { timeLeft, running, start, pause, reset, addTime };
}

// ── PlateVisualizer moved to components/PlateVisualizer.jsx so the dashboard
//    and workout session can share the same barbell/dumbbell renderer.

function TimerRing({ seconds, running, accentColor = 'var(--color-accent)', label = 'Rest' }) {
  const initialRef = useRef(Math.max(seconds, 1));
  if (seconds > initialRef.current) initialRef.current = seconds;
  const total = initialRef.current;
  const pct = total > 0 ? Math.max(0, seconds / total) : 0;
  const circ = 2 * Math.PI * 75;
  const offset = circ * (1 - pct);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const urgent = seconds <= 10 && running;

  return (
    <div className="relative w-44 h-44 mx-auto">
      <svg width={176} height={176} className="transform -rotate-90">
        <circle cx={88} cy={88} r={75} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
        <circle cx={88} cy={88} r={75} fill="none" stroke={accentColor} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: running ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.3s ease' }}
          filter={`drop-shadow(0 0 10px ${accentColor}60)`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-[3rem] font-black tabular-nums leading-none ${urgent ? 'text-[var(--color-warning)]' : 'text-[var(--text-primary)]'}`}>
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
        <span className="armor-text-caption mt-1">{label}</span>
      </div>
    </div>
  );
}

/* ── MVD Screen ────────────────────────────────────────────── */
function MVDScreen({ onComplete }) {
  const [completed, setCompleted] = useState({});

  const items = [
    { id: 'pushups', label: '5×20 Push-Ups', description: '5 sets of 20 push-ups, 30 sec rest between sets' },
    { id: 'walk', label: '10-Minute Walk', description: 'A brisk 10-minute walk to blunt glucose' },
    { id: 'mobility', label: '5-Minute Mobility', description: 'Hips, hamstrings, thoracic spine' },
  ];

  const allComplete = items.every(item => completed[item.id]);

  const handleComplete = () => {
    HAPTIC.success();
    onComplete?.({
      date: new Date().toISOString().split('T')[0],
      day: 1, week: 1, completed: true,
      exercises: items.map(item => ({
        id: item.id,
        sets: completed[item.id] ? [{ set: 1, reps: 1, weight: 0, notes: 'MVD' }] : [],
      })).filter(e => e.sets.length > 0),
    });
  };

  return (
    <div className="flex flex-col flex-1 px-6 pt-4 text-center max-w-sm mx-auto w-full">
      <div className="text-3xl mb-2">🛡️</div>
      <h2 className="text-2xl font-black text-[var(--text-primary)] mb-1">Minimum Viable Day</h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6">A self-contained circuit. Fits in 15 minutes.</p>

      <div className="w-full space-y-3 mb-6">
        {items.map((item) => {
          const isDone = !!completed[item.id];
          return (
            <button
              key={item.id}
              onClick={() => setCompleted(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
              className={`w-full text-left p-4 rounded-xl flex items-center gap-3 ${
                isDone ? 'bg-[var(--color-success-muted)] ring-1 ring-[var(--color-success-muted)]' : 'bg-[var(--color-surface-1)]'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                isDone ? 'bg-[var(--color-success)]' : 'bg-[var(--color-surface-1)]'
              }`}>
                {isDone && <Check size={14} className="text-[var(--text-primary)]" strokeWidth={3} />}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className={`text-sm font-bold ${isDone ? 'text-[var(--color-success)] line-through' : 'text-[var(--text-primary)]'}`}>
                  {item.label}
                </p>
                <p className="text-[11px] text-[var(--text-tertiary)]">{item.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleComplete}
        disabled={!allComplete}
        className={`armor-press w-full py-5 rounded-2xl text-[var(--text-primary)] font-black text-lg bg-[var(--color-accent)] ${
          allComplete ? '' : 'opacity-50 pointer-events-none'
        }`}
      >
        <Check size={20} className="inline mr-2" strokeWidth={3} />
        Finish & Log
      </button>
    </div>
  );
}

/* ── VO2 Max Screen ────────────────────────────────────────── */
function VO2MaxScreen({ protocol, onComplete }) {
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState('idle');
  const timer = useTimer(protocol.workSeconds);

  const isWork = phase === 'work';
  const isRest = phase === 'rest';
  const isLastRound = round >= protocol.rounds;

  useEffect(() => {
    if (isWork && timer.timeLeft === 0) {
      HAPTIC.warning();
      if (isLastRound) { onComplete?.(); return; }
      setPhase('rest'); timer.reset(protocol.restSeconds); timer.start();
    }
    // timer and protocol values are stable; only re-evaluate on phase boundary
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWork, timer.timeLeft]);

  useEffect(() => {
    if (isRest && timer.timeLeft === 0) {
      setRound(r => r + 1); setPhase('work'); timer.reset(protocol.workSeconds); timer.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRest, timer.timeLeft]);

  return (
    <div className="flex flex-col flex-1 px-6 pt-4 text-center max-w-sm mx-auto w-full">
      <p className="armor-text-caption text-[var(--color-cardio)]">Round {round}/{protocol.rounds}</p>

      <div className="my-8">
        <TimerRing seconds={timer.timeLeft} running={timer.running} accentColor="var(--color-cardio)" label={isWork ? 'GO HARD' : isRest ? 'RECOVER' : 'READY'} />
      </div>

      <div className={`rounded-2xl px-6 py-5 mb-8 transition-all ${
        isWork ? 'bg-[var(--color-cardio-muted)]' : isRest ? 'bg-[var(--color-success-muted)]' : 'bg-[var(--color-surface-1)]'
      }`}>
        <p className={`text-xl font-black ${isWork ? 'text-[var(--color-cardio)]' : isRest ? 'text-[var(--color-success)]' : 'text-[var(--text-secondary)]'}`}>
          {isWork ? '🏃 PUSH' : isRest ? '😮‍💨 BREATHE' : 'Ready?'}
        </p>
        <p className="text-[11px] text-[var(--text-secondary)] mt-1">
          {isWork ? protocol.targetHR : isRest ? 'Slow down, deep breaths' : 'Tap to begin'}
        </p>
      </div>

      <div className="mt-auto pb-8 space-y-3">
        {phase === 'idle' && (
          <button onClick={() => { setPhase('work'); timer.start(); HAPTIC.medium(); }}
            className="armor-press w-full py-5 rounded-2xl text-[var(--text-primary)] font-black text-lg bg-[var(--color-cardio)]">
            <Play size={20} className="inline mr-2 fill-current" /> Start Intervals
          </button>
        )}
        {(isWork || isRest) && timer.running && (
          <button onClick={() => { timer.pause(); HAPTIC.light(); }}
            className="armor-press w-full py-4 rounded-2xl bg-[var(--color-surface-1)] text-[var(--text-primary)] font-bold">
            <Pause size={16} className="inline mr-2" /> Pause
          </button>
        )}
        {(isWork || isRest) && !timer.running && (
          <button onClick={() => { timer.start(); HAPTIC.light(); }}
            className="armor-press w-full py-4 rounded-2xl bg-[var(--color-surface-1)] text-[var(--text-primary)] font-bold">
            <Play size={16} className="inline mr-2 fill-current" /> Resume
          </button>
        )}
        <button onClick={() => { HAPTIC.light(); onComplete?.(); }}
          className="w-full py-3 text-[var(--text-disabled)] text-sm font-semibold">
          End Early
        </button>
      </div>
    </div>
  );
}

/* ── End Workout Confirmation Modal ───────────────────────── */
function EndWorkoutConfirm({ setCount, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70">
      <div className="bg-[var(--color-surface-1)] rounded-2xl p-6 max-w-sm w-full">
        <p className="text-lg font-bold text-[var(--text-primary)] mb-2">End workout?</p>
        <p className="text-sm text-[var(--text-secondary)] mb-6">You&apos;ve completed {setCount} set{setCount !== 1 ? 's' : ''}.</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-[var(--color-surface-1)] text-[var(--text-primary)] font-semibold">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-[var(--color-cardio-muted)] text-[var(--color-cardio)] font-semibold">
            End Workout
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Strength Workout Screen ───────────────────────────────── */
function StrengthScreen({ primaryLift, accessories, currentWeek, currentDay, onComplete, track = 'full_gym', onNavigateToSettings, activeModifiers = {} }) {
  const { workoutHistory, preferences } = useShift6Data();
  const unit = preferences.unit || 'lbs';
  const queue = useMemo(() => {
    const q = [];
    if (primaryLift) q.push({ ...primaryLift, type: 'primary' });
    accessories.forEach(a => q.push({ ...a, type: 'accessory' }));
    return q;
  }, [primaryLift, accessories]);

  const [exIdx, setExIdx] = useState(0);
  const [setNum, setSetNum] = useState(1);
  const [phase, setPhase] = useState('active');
  const [completedSets, setCompletedSets] = useState([]);
  const [failedSets, setFailedSets] = useState([]);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [customQueue, setCustomQueue] = useState(null); // null = use prop-derived queue
  // Single-flight lock to prevent double-counting a set on rapid taps
  // (e.g. the user mashes the Complete button faster than React can
  // commit the previous state). Resets on the next render.
  const [completingSet, setCompletingSet] = useState(false);
  const justCompletedTimerRef = useRef(null);

  // Use custom queue if set, otherwise fall back to prop-derived queue
  // (must be declared before anything that reads `currentEx`)
  const activeQueue = customQueue || queue;
  const { checkPR } = usePRDetection();
  const currentEx = activeQueue[exIdx];
  const totalSets = currentEx?.sets || 3;
  const restSecs = currentEx?.type === 'primary' ? 120 : 90;
  const timer = useTimer(restSecs);

  // Build swap alternatives from SPLIT_DAYS based on current exercise body part
  const swapAlts = useMemo(() => {
    if (!currentEx) return [];
    const bodyPart = currentEx.bodyPart || '';
    // Find days with matching body part
    const allDays = [...SPLIT_DAYS.full_gym, ...SPLIT_DAYS.home_gym];
    const matching = allDays.filter(d => d.bodyPart === bodyPart && d.primary && d.primary !== currentEx.exerciseId);
    // Deduplicate by exercise id
    const seen = new Set();
    return matching.filter(d => {
      if (seen.has(d.primary)) return false;
      seen.add(d.primary);
      return true;
    }).map(d => d.primary);
  }, [currentEx]);

  // Reset state when exercise index changes; currentEx is derived from exIdx via queue[exIdx]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setSetNum(1); setPhase(currentEx ? 'active' : 'done'); setNotes(''); }, [exIdx]);

  useEffect(() => {
    if (phase === 'rest' && timer.timeLeft === 0 && timer.running) {
      timer.pause(); setPhase('active'); HAPTIC.medium();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timer.timeLeft, timer.running]);

  // Clear the "just completed" celebration timer on unmount so we don't
  // call setState on a torn-down component (B-5 follow-up).
  useEffect(() => () => {
    if (justCompletedTimerRef.current) clearTimeout(justCompletedTimerRef.current);
  }, []);

  const handleCompleteSet = useCallback(() => {
    // Reject double-taps that slip through React's batching. Without this,
    // a rapid second click on the Complete button will read the stale
    // setNum and append a duplicate set to completedSets.
    if (completingSet) return;
    setCompletingSet(true);
    try {
      // Read current setNum via the functional updater below so we get
      // the post-render value, not the closure's stale value.
      setSetNum(prevSetNum => {
        const currentSetNum = prevSetNum;
        setCompletedSets(prev => [
          ...prev,
          { exerciseId: currentEx.exerciseId, set: currentSetNum, reps: currentEx.reps, weight: currentEx.weight, notes },
        ]);
        // PR check on final set of the primary lift
        if (currentEx.type === 'primary' && currentSetNum === totalSets) {
          checkPR(currentEx.exerciseId, currentEx.weight, currentEx.reps);
        }
        // Advance setNum or move to next exercise
        if (currentSetNum >= totalSets) {
          if (exIdx < activeQueue.length - 1) {
            setExIdx(prev => prev + 1);
            return 1; // reset for the next exercise's first set
          } else {
            setPhase('done');
            HAPTIC.success();
            return currentSetNum;
          }
        } else {
          setPhase('rest');
          timer.reset(restSecs);
          timer.start();
          return currentSetNum + 1;
        }
      });
      setNotes('');
      setShowNotes(false);
      setJustCompleted(true);
      if (justCompletedTimerRef.current) clearTimeout(justCompletedTimerRef.current);
      justCompletedTimerRef.current = setTimeout(() => setJustCompleted(false), 600);
    } catch (e) {
      console.warn('[Shift6Workout] handleCompleteSet error:', e);
    } finally {
      // Release the lock on the next tick so the user can complete the
      // next set. Microtask is enough — React 18 will have flushed.
      queueMicrotask(() => setCompletingSet(false));
    }
  }, [completingSet, currentEx, totalSets, exIdx, activeQueue.length, timer, restSecs, notes, checkPR]);

  // Mark the active set as failed and advance. Lets users record when
  // they couldn't hit the prescribed weight/reps. Tracked separately
  // from completedSets so the workout summary + engine can compute
  // deload recommendations based on failure rate.
  const handleFailSet = useCallback(() => {
    if (completingSet) return;
    setCompletingSet(true);
    try {
      setSetNum(prevSetNum => {
        const currentSetNum = prevSetNum;
        setFailedSets(prev => [
          ...prev,
          { exerciseId: currentEx.exerciseId, set: currentSetNum, reps: currentEx.reps, weight: currentEx.weight, notes },
        ]);
        if (currentSetNum >= totalSets) {
          if (exIdx < activeQueue.length - 1) {
            setExIdx(prev => prev + 1);
            return 1;
          } else {
            setPhase('done');
            HAPTIC.warning();
            return currentSetNum;
          }
        } else {
          setPhase('rest');
          timer.reset(restSecs);
          timer.start();
          return currentSetNum + 1;
        }
      });
      setNotes('');
      setShowNotes(false);
    } finally {
      setCompletingSet(false);
    }
  }, [completingSet, currentEx, totalSets, exIdx, activeQueue.length, timer, restSecs, notes]);

  const handleFinish = useCallback(() => {
    HAPTIC.medium();
    if (completedSets.length > 0 || failedSets.length > 0) {
      onComplete?.({
        date: new Date().toISOString().split('T')[0],
        day: currentDay, week: currentWeek, completed: true,
        exercises: activeQueue.map(ex => ({
          id: ex.exerciseId,
          sets: completedSets.filter(s => s.exerciseId === ex.exerciseId),
          failedSets: failedSets.filter(s => s.exerciseId === ex.exerciseId),
        })).filter(e => e.sets.length > 0 || e.failedSets.length > 0),
        failedSetsCount: failedSets.length,
      });
    } else { onComplete?.({ completed: false }); }
  }, [completedSets, failedSets, currentDay, currentWeek, activeQueue, onComplete]);

  const weekConfig = getWeekConfig(currentWeek);

  // Find last workout with this exercise for "Last time" reference
  const lastEntry = useMemo(() => {
    if (!currentEx) return null;
    const entries = workoutHistory.filter(w => w.exercises?.some(e => e.id === currentEx.exerciseId && e.sets?.length > 0));
    if (entries.length === 0) return null;
    const last = entries[entries.length - 1];
    const exData = last.exercises.find(e => e.id === currentEx.exerciseId);
    if (!exData || !exData.sets || exData.sets.length === 0) return null;
    const prevSet = exData.sets[exData.sets.length - 1];
    return prevSet;
  }, [workoutHistory, currentEx]);

  // Show the "Set 1RMs in Settings" nudge whenever the active exercise
  // has a 0 weight — without it, an empty-state user sees "Weight: 0 lbs"
  // which is meaningless and concerning. Previously this fired only on
  // primary lifts, but accessories (e.g. Leg Press) also need it because
  // the empty user has no 1RM entries at all.
  const showZeroLbsNudge = currentEx?.weight === 0;

  /* ── DONE SCREEN ─────────────────────────────────────────── */
  if (phase === 'done') {
    const totalVolume = completedSets.reduce((s, x) => s + x.reps * x.weight, 0);
    return (
      <div className="flex flex-col flex-1 px-6 pt-4 text-center max-w-sm mx-auto w-full items-center justify-center space-y-6 armor-entrance">
        <div style={{ fontSize: '64px' }}>🏆</div>
        <div>
          <h2 className="armor-text-large-title mb-1">Workout Complete</h2>
          <p className="armor-text-footnote">
            {completedSets.length} sets · {totalVolume > 0 ? `${(unit === 'kg' ? Math.round(totalVolume / 2.20462) : totalVolume).toLocaleString()} ${unit}` : 'Great work'}
          </p>
        </div>
        <div className="w-full space-y-1.5">
          {activeQueue.map((ex, i) => {
            const exSets = completedSets.filter(s => s.exerciseId === ex.exerciseId);
            if (!exSets.length) return null;
            const displayWeight = unit === 'kg' ? Math.round(ex.weight / 2.20462) : ex.weight;
            return (
              <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--color-surface-1)]">
                <div className="text-left">
                  <p className="text-sm font-semibold text-[var(--text-primary)] capitalize">{ex.exerciseId?.replace(/_/g, ' ')}</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">{exSets.length} sets × {ex.reps} reps @ {displayWeight}{unit}</p>
                </div>
                <span className="text-[11px] font-bold text-[var(--text-secondary)]">{ex.type === 'primary' ? weekConfig.phase : 'Acc'}</span>
              </div>
            );
          })}
        </div>
        <button onClick={handleFinish}
          className="armor-press w-full py-5 rounded-2xl text-[var(--text-primary)] font-black text-lg bg-[var(--color-accent)]">
          <Check size={20} className="inline mr-2" strokeWidth={3} /> Finish & Log
        </button>
      </div>
    );
  }

  /* ── REST SCREEN ──────────────────────────────────────────── */
  if (phase === 'rest') {
    // Peek at the next exercise in the queue, if any. Show its
    // illustration as a "what's next" preview under the timer.
    const nextEx = exIdx < activeQueue.length - 1 ? activeQueue[exIdx + 1] : null;
    return (
      <div className="flex flex-col flex-1 px-6 pt-4 text-center max-w-sm mx-auto w-full armor-entrance">
        {/* 'Recover' label removed — the big timer labeled 'Rest' is the
            primary visual focus; the duplicate text label was chrome. */}
        <h3 className="text-base font-bold text-[var(--text-primary)] mb-1 capitalize">
          {currentEx.exerciseId?.replace(/_/g, ' ')}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Set {setNum} of {totalSets} · {currentEx.reps} reps @ {Math.round(currentEx.weight / (unit === 'kg' ? 2.20462 : 1))}{unit}
        </p>
        <TimerRing seconds={timer.timeLeft} running={timer.running} accentColor="var(--color-accent)" label="Rest" />
        {timer.timeLeft <= 10 && timer.running && (
          <p className="text-[var(--color-warning)] text-sm font-bold mt-3 armor-entrance">Ready up</p>
        )}
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button variant="secondary" size="sm" onClick={() => { timer.addTime(-15); HAPTIC.light(); }}>-15</Button>
          <Button variant="secondary" size="sm" onClick={() => { timer.addTime(15); HAPTIC.light(); }}>+15</Button>
        </div>
        {nextEx && (
          <div className="mt-5 pt-4 border-t border-[var(--color-divider)]">
            <p className="armor-text-caption mb-2">Up next</p>
            <div className="flex items-center gap-3">
              <ExerciseIllustration
                exerciseId={nextEx.exerciseId}
                compact
                className="w-16 h-16 shrink-0 rounded-lg"
              />
              <div className="text-left min-w-0 flex-1">
                <p className="text-sm font-semibold capitalize truncate">
                  {nextEx.exerciseId?.replace(/_/g, ' ')}
                </p>
                <p className="armor-text-footnote">
                  {nextEx.reps} reps
                  {nextEx.type === 'primary' && ` @ ${Math.round((nextEx.weight || 0) / (unit === 'kg' ? 2.20462 : 1))}${unit}`}
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="mt-auto pb-8 pt-6">
          <Button
            variant="primary"
            size="lg"
            iconRight={<ChevronRight size={18} />}
            onClick={() => { timer.pause(); setPhase('active'); HAPTIC.medium(); }}
          >
            Skip Rest
          </Button>
        </div>
      </div>
    );
  }

  /* ── ACTIVE SET SCREEN ────────────────────────────────────── */
  if (!currentEx) {
    return (
      <div className="flex flex-col flex-1 px-6 pt-4 text-center max-w-sm mx-auto w-full items-center justify-center">
        <p className="text-[var(--text-secondary)] text-sm">Loading exercise…</p>
      </div>
    );
  }

  return (
    <WorkoutErrorBoundary onSkip={handleCompleteSet}>
      <div className="flex flex-col flex-1 px-6 pt-4 pb-32 max-w-sm mx-auto w-full armor-entrance overflow-y-auto">
      <div className="mb-6">
        <ExerciseIllustration
          exerciseId={currentEx.exerciseId}
          className="mb-4 -mx-2 max-h-56"
        />
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-black text-[var(--text-primary)] capitalize mt-0.5">
            {currentEx.exerciseId?.replace(/_/g, ' ')}
          </h2>
          {swapAlts.length > 0 && (
            <button
              onClick={() => setShowSwap(true)}
              className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-surface-1)] text-[var(--text-secondary)] font-medium hover:text-[var(--color-accent)] transition-colors"
            >
              Swap
            </button>
          )}
          {activeModifiers.highFatigue && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-warning-muted)] text-[var(--color-warning)] font-semibold">
              CNS fatigue: 60% 1RM, hypertrophy
            </span>
          )}
          {activeModifiers.travelMode && (
            <span className="text-[10px] px-2 py-0.5 rounded-full armor-badge armor-badge-accent font-semibold">
              Travel: bodyweight subs
            </span>
          )}
        </div>
        <p className="armor-text-footnote">
          {weekConfig.phase} · Week {currentWeek} · Set {setNum}/{totalSets}
        </p>
      </div>

      {lastEntry && (
        <p className="armor-text-caption mb-3">
          Last: {Math.round(lastEntry.weight / (unit === 'kg' ? 2.20462 : 1))} {unit} × {lastEntry.reps}
        </p>
      )}

      <Card padded={false} className="px-6 py-6 mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="armor-text-caption mb-1">Sets</p>
            <p className="text-2xl font-black text-[var(--text-primary)]">{totalSets}</p>
          </div>
          <div>
            <p className="armor-text-caption mb-1">Reps</p>
            <p className="text-2xl font-black text-[var(--color-accent)]">{currentEx.reps}</p>
          </div>
          <div>
            <p className="armor-text-caption mb-1">Weight</p>
            {showZeroLbsNudge ? (
              <button
                onClick={() => { HAPTIC.light(); onNavigateToSettings ? onNavigateToSettings() : console.warn('onNavigateToSettings not provided'); }}
                className="text-sm font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent)] opacity-80 underline"
              >
                Set your 1RM in Settings →
              </button>
            ) : (
              <p className="text-2xl font-black text-[var(--text-primary)]">{Math.round(currentEx.weight / (unit === 'kg' ? 2.20462 : 1))}<span className="text-sm text-[var(--text-secondary)] ml-1">{unit}</span></p>
            )}
          </div>
        </div>
        {!showZeroLbsNudge && currentEx.weight > 0 && (
          <div className="mt-4 pt-4 border-t border-t border-[var(--color-divider)]">
            <PlateVisualizer
              weight={unit === 'kg' ? Math.round(currentEx.weight / 2.20462) : currentEx.weight}
              track={track}
              unit={unit}
            />
          </div>
        )}
      </Card>

      {/* Set X of Y indicator — replaces the page-dot pagination.
           Text tells the user exactly where they are in the workout
           without an extra row of dots taking vertical space. */}
      <p className="text-center text-[11px] uppercase tracking-widest text-[var(--text-tertiary)] mb-4">
        Set {setNum} of {totalSets}
      </p>

      {showNotes ? (
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          autoFocus
          placeholder="RPE, form notes..."
          className="w-full bg-[var(--color-surface-1)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none mb-6"
        />
      ) : (
        <button
          onClick={() => setShowNotes(true)}
          className="armor-press w-full text-left text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] mb-4 px-1 py-1 transition-colors"
        >
          + Add note (RPE, form)
        </button>
      )}

      <Button
        variant="primary"
        size="lg"
        icon={<Check size={20} strokeWidth={3} />}
        onClick={handleCompleteSet}
        className={`w-full transition-transform ${justCompleted ? 'scale-95' : ''}`}
      >
        Complete Set {setNum}
      </Button>

      {/* Fail Set — marks the active set as failed. Distinct from
          End Workout because the workout continues; distinct from
          ErrorBoundary's "Skip Set" because there's no error.
          Triggers a warning haptic and feeds the deload heuristic. */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleFailSet}
        className="w-full mt-2 text-[var(--color-warning)]"
        data-testid="fail-set-button"
      >
        Fail Set {setNum}
      </Button>

      <Button variant="ghost" size="sm" onClick={() => setShowEndConfirm(true)} className="w-full mt-2">
        End Workout
      </Button>

      {showEndConfirm && (
        <EndWorkoutConfirm
          setCount={completedSets.length}
          onConfirm={handleFinish}
          onCancel={() => setShowEndConfirm(false)}
        />
      )}

      {/* Exercise Swap Modal */}
      {showSwap && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowSwap(false)}>
          <div className="bg-[var(--elevation-4-bg)] w-full max-w-sm mx-auto p-4 border-t border-t border-[var(--color-divider)]" onClick={e => e.stopPropagation()}>
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              Swap <span className="text-[var(--text-primary)] font-semibold capitalize">{currentEx.exerciseId?.replace(/_/g, ' ')}</span> for:
            </p>
            <div className="space-y-1 mb-3">
              {swapAlts.map(altId => (
                <button
                  key={altId}
                  onClick={() => {
                    // Build a new queue with the swapped exercise
                    const newQueue = activeQueue.map(ex =>
                      ex.exerciseId === currentEx.exerciseId
                        ? { ...ex, exerciseId: altId }
                        : ex
                    );
                    setCustomQueue(newQueue);
                    setExIdx(0);
                    setPhase('active');
                    setSetNum(1);
                    setShowSwap(false);
                  }}
                  className="w-full text-left p-3 rounded-xl hover:bg-[var(--color-surface-1)] text-[var(--text-primary)] font-medium capitalize"
                >
                  {altId.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowSwap(false)}
              className="w-full p-3 text-[var(--text-tertiary)] text-sm font-medium text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
    </WorkoutErrorBoundary>
  );
}

/* ── MAIN ──────────────────────────────────────────────────── */
export default function Shift6WorkoutSession({ onComplete, onCancel, onNavigateToSettings }) {
  return (
    <WorkoutErrorBoundary>
      <Shift6WorkoutSessionInner onComplete={onComplete} onCancel={onCancel} onNavigateToSettings={onNavigateToSettings} />
    </WorkoutErrorBoundary>
  );
}

function Shift6WorkoutSessionInner({ onComplete, onCancel, onNavigateToSettings }) {
  const { activeModifiers, currentCycle, estimated1RMs, effectiveTrack } = useShift6Data();
  const { celebration, setCelebration } = usePRDetection();
  const [showConfetti, setShowConfetti] = useState(false);

  const todayWorkout = useMemo(() =>
    getTodaysWorkout(effectiveTrack, currentCycle.day, currentCycle.week, activeModifiers, estimated1RMs),
    [effectiveTrack, currentCycle.day, currentCycle.week, activeModifiers, estimated1RMs]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--elevation-0-bg)]">
      {showConfetti && <ConfettiBurst count={50} />}
      {celebration && <AwardModal achievement={celebration} onDismiss={() => { setShowConfetti(false); setCelebration(null); }} />}

      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <button
          onClick={() => { HAPTIC.light(); onCancel?.(); }}
          aria-label="Close workout session"
          className="armor-press w-10 h-10 rounded-full bg-[var(--color-surface-1)] flex items-center justify-center"
        >
          <X size={18} className="text-[var(--text-secondary)]" />
        </button>
        <div className="text-center">
          <p className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-widest">{todayWorkout.name}</p>
          <p className="text-[10px] text-[var(--text-disabled)]">Week {currentCycle.week} · Day {currentCycle.day}</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex">
        {todayWorkout.type === 'vo2max' ? (
          <VO2MaxScreen protocol={VO2MAX_PROTOCOL} onComplete={onComplete} />
        ) : todayWorkout.type === 'mvd' ? (
          <MVDScreen onComplete={onComplete} />
        ) : (
          <StrengthScreen
            primaryLift={todayWorkout.primaryLift}
            accessories={todayWorkout.accessories}
            currentWeek={currentCycle.week}
            currentDay={currentCycle.day}
            onComplete={onComplete}
            onNavigateToSettings={onNavigateToSettings}
            track={effectiveTrack}
            activeModifiers={activeModifiers}
          />
        )}
      </div>
    </div>
  );
}
