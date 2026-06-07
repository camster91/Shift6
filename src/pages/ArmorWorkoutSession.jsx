import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, Check, X, ChevronRight } from 'lucide-react';
import { useArmorData } from '../context/ArmorDataContext';
import {
  getTodaysWorkout, VO2MAX_PROTOCOL, getWeekConfig, SPLIT_DAYS
} from '../data/armorEngine';
import { ConfettiBurst, AwardModal } from '../components/Celebration';
import PlateVisualizer from '../components/PlateVisualizer';
import { usePRDetection } from '../hooks/usePRDetection';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

/* ═══════════════════════════════════════════════════════════
   ARMOR WORKOUT SESSION v2.0 — Apple HIG
   Haptic map. Spring animations. PR detection. Confetti.
   ═══════════════════════════════════════════════════════════ */

const HAPTIC = {
  // Vibration is optional; suppress no-empty since failure is non-actionable
  // eslint-disable-next-line no-empty
  light: () => { try { navigator.vibrate?.(10); } catch {} },
  // eslint-disable-next-line no-empty
  medium: () => { try { navigator.vibrate?.(20); } catch {} },
  // eslint-disable-next-line no-empty
  heavy: () => { try { navigator.vibrate?.(100); } catch {} },
  // eslint-disable-next-line no-empty
  success: () => { try { navigator.vibrate?.([50, 30, 100]); } catch {} },
  // eslint-disable-next-line no-empty
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

function TimerRing({ seconds, running, accentColor = '#06b6d4', label = 'Rest' }) {
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
        <span className={`text-[3rem] font-black tabular-nums leading-none ${urgent ? 'text-amber-400' : 'text-white'}`}>
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
        <span className="armor-text-caption mt-1" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      </div>
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
      <p className="armor-text-caption" style={{ color: 'var(--color-cardio)' }}>Round {round}/{protocol.rounds}</p>

      <div className="my-8">
        <TimerRing seconds={timer.timeLeft} running={timer.running} accentColor="#f43f5e" label={isWork ? 'GO HARD' : isRest ? 'RECOVER' : 'READY'} />
      </div>

      <div className={`rounded-2xl px-6 py-5 mb-8 transition-all ${
        isWork ? 'bg-rose-500/10' : isRest ? 'bg-emerald-500/10' : 'bg-white/[0.03]'
      }`}>
        <p className={`text-xl font-black ${isWork ? 'text-rose-400' : isRest ? 'text-emerald-400' : 'text-slate-400'}`}>
          {isWork ? '🏃 PUSH' : isRest ? '😮‍💨 BREATHE' : 'Ready?'}
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          {isWork ? protocol.targetHR : isRest ? 'Slow down, deep breaths' : 'Tap to begin'}
        </p>
      </div>

      <div className="mt-auto pb-8 space-y-3">
        {phase === 'idle' && (
          <button onClick={() => { setPhase('work'); timer.start(); HAPTIC.medium(); }}
            className="armor-press w-full py-5 rounded-2xl text-white font-black text-lg"
            style={{ background: 'var(--color-cardio)' }}>
            <Play size={20} className="inline mr-2 fill-current" /> Start Intervals
          </button>
        )}
        {(isWork || isRest) && timer.running && (
          <button onClick={() => { timer.pause(); HAPTIC.light(); }}
            className="armor-press w-full py-4 rounded-2xl bg-white/[0.06] text-white font-bold">
            <Pause size={16} className="inline mr-2" /> Pause
          </button>
        )}
        {(isWork || isRest) && !timer.running && (
          <button onClick={() => { timer.start(); HAPTIC.light(); }}
            className="armor-press w-full py-4 rounded-2xl bg-white/[0.06] text-white font-bold">
            <Play size={16} className="inline mr-2 fill-current" /> Resume
          </button>
        )}
        <button onClick={() => { HAPTIC.light(); onComplete?.(); }}
          className="w-full py-3 text-slate-600 text-sm font-semibold">
          End Early
        </button>
      </div>
    </div>
  );
}

/* ── End Workout Confirmation Modal ───────────────────────── */
function EndWorkoutConfirm({ setCount, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="bg-white/[0.06] rounded-2xl p-6 max-w-sm w-full">
        <p className="text-lg font-bold text-white mb-2">End workout?</p>
        <p className="text-sm text-slate-400 mb-6">You&apos;ve completed {setCount} set{setCount !== 1 ? 's' : ''}.</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-white/[0.06] text-white font-semibold">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-rose-500/20 text-rose-400 font-semibold">
            End Workout
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Strength Workout Screen ───────────────────────────────── */
function StrengthScreen({ primaryLift, accessories, currentWeek, currentDay, onComplete, track = 'full_gym', onNavigateToSettings, activeModifiers = {} }) {
  const { workoutHistory, preferences } = useArmorData();
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
  const [notes, setNotes] = useState('');
  const [justCompleted, setJustCompleted] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [customQueue, setCustomQueue] = useState(null); // null = use prop-derived queue

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

  // Use custom queue if set, otherwise fall back to prop-derived queue
  const activeQueue = customQueue || queue;

  const { checkPR } = usePRDetection();
  const currentEx = activeQueue[exIdx];
  const totalSets = currentEx?.sets || 3;
  const restSecs = currentEx?.type === 'primary' ? 120 : 90;
  const timer = useTimer(restSecs);

  // Reset state when exercise index changes; currentEx is derived from exIdx via queue[exIdx]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setSetNum(1); setPhase(currentEx ? 'active' : 'done'); setNotes(''); }, [exIdx]);

  useEffect(() => {
    if (phase === 'rest' && timer.timeLeft === 0 && timer.running) {
      timer.pause(); setPhase('active'); HAPTIC.medium();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timer.timeLeft, timer.running]);

  const handleCompleteSet = useCallback(() => {
    HAPTIC.heavy();
    setCompletedSets(prev => [...prev, { exerciseId: currentEx.exerciseId, set: setNum, reps: currentEx.reps, weight: currentEx.weight, notes }]);
    setJustCompleted(true);
    setTimeout(() => setJustCompleted(false), 600);

    // Check for PR on primary lift final set
    if (currentEx.type === 'primary' && setNum === totalSets) {
      checkPR(currentEx.exerciseId, currentEx.weight, currentEx.reps);
    }

    if (setNum >= totalSets) {
      if (exIdx < activeQueue.length - 1) { setExIdx(prev => prev + 1); }
      else { setPhase('done'); HAPTIC.success(); }
    } else {
      setSetNum(prev => prev + 1); setPhase('rest');
      timer.reset(restSecs); timer.start();
    }
    setNotes('');
  }, [setNum, currentEx, totalSets, exIdx, activeQueue.length, timer, restSecs, notes, checkPR]);

  const handleFinish = useCallback(() => {
    HAPTIC.medium();
    if (completedSets.length > 0) {
      onComplete?.({
        date: new Date().toISOString().split('T')[0],
        day: currentDay, week: currentWeek, completed: true,
        exercises: activeQueue.map(ex => ({
          id: ex.exerciseId,
          sets: completedSets.filter(s => s.exerciseId === ex.exerciseId),
        })).filter(e => e.sets.length > 0),
      });
    } else { onComplete?.({ completed: false }); }
  }, [completedSets, currentDay, currentWeek, activeQueue, onComplete]);

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

  const showZeroLbsNudge = currentEx?.type === 'primary' && currentEx?.weight === 0;

  /* ── DONE SCREEN ─────────────────────────────────────────── */
  if (phase === 'done') {
    const totalVolume = completedSets.reduce((s, x) => s + x.reps * x.weight, 0);
    return (
      <div className="flex flex-col flex-1 px-6 pt-4 text-center max-w-sm mx-auto w-full items-center justify-center space-y-6 armor-entrance">
        <div style={{ fontSize: '64px' }}>🏆</div>
        <div>
          <h2 className="armor-text-large-title mb-1">Workout Complete</h2>
          <p className="armor-text-footnote">
            {completedSets.length} sets · {totalVolume > 0 ? `${totalVolume.toLocaleString()} lbs` : 'Great work'}
          </p>
        </div>
        <div className="w-full space-y-1.5">
          {activeQueue.map((ex, i) => {
            const exSets = completedSets.filter(s => s.exerciseId === ex.exerciseId);
            if (!exSets.length) return null;
            return (
              <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03]">
                <div className="text-left">
                  <p className="text-sm font-semibold text-white capitalize">{ex.exerciseId?.replace(/_/g, ' ')}</p>
                  <p className="text-[11px] text-slate-400">{exSets.length} sets × {ex.reps} reps @ {ex.weight}lbs</p>
                </div>
                <span className="text-[11px] font-bold text-slate-400">{ex.type === 'primary' ? weekConfig.phase : 'Acc'}</span>
              </div>
            );
          })}
        </div>
        <button onClick={handleFinish}
          className="armor-press w-full py-5 rounded-2xl text-white font-black text-lg"
          style={{ background: 'var(--color-accent)' }}>
          <Check size={20} className="inline mr-2" strokeWidth={3} /> Finish & Log
        </button>
      </div>
    );
  }

  /* ── REST SCREEN ──────────────────────────────────────────── */
  if (phase === 'rest') {
    return (
      <div className="flex flex-col flex-1 px-6 pt-4 text-center max-w-sm mx-auto w-full armor-entrance">
        <p className="armor-text-caption mb-1">Recover</p>
        <h3 className="text-base font-bold text-white mb-6">
          Set {setNum} of {totalSets} · {currentEx.reps} reps @ {Math.round(currentEx.weight / (unit === 'kg' ? 2.20462 : 1))}{unit}
        </h3>
        <TimerRing seconds={timer.timeLeft} running={timer.running} accentColor="#06b6d4" label="Rest" />
        {timer.timeLeft <= 10 && timer.running && (
          <p className="text-amber-400 text-sm font-bold mt-3 armor-entrance">Ready up</p>
        )}
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button variant="secondary" size="sm" onClick={() => { timer.addTime(-15); HAPTIC.light(); }}>-15</Button>
          <Button variant="secondary" size="sm" onClick={() => { timer.addTime(15); HAPTIC.light(); }}>+15</Button>
        </div>
        <div className="mt-auto pb-8 space-y-3">
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
  return (
    <div className="flex flex-col flex-1 px-6 pt-4 max-w-sm mx-auto w-full armor-entrance">
      <div className="mb-6">
        <p className="armor-text-caption" style={{ color: 'var(--text-tertiary)' }}>
          {currentEx.type === 'primary' ? 'PRIMARY LIFT' : 'ACCESSORY'}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-black text-white capitalize mt-0.5">
            {currentEx.exerciseId?.replace(/_/g, ' ')}
          </h2>
          {swapAlts.length > 0 && (
            <button
              onClick={() => setShowSwap(true)}
              className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 font-medium hover:text-cyan-400 transition-colors"
            >
              Swap
            </button>
          )}
          {activeModifiers.highFatigue && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold">
              CNS fatigue: 60% 1RM, hypertrophy
            </span>
          )}
          {activeModifiers.travelMode && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-semibold">
              Travel: bodyweight subs
            </span>
          )}
        </div>
        <p className="armor-text-footnote" style={{ color: 'var(--text-tertiary)' }}>
          {weekConfig.phase} · Week {currentWeek} · Set {setNum}/{totalSets}
        </p>
      </div>

      {lastEntry && (
        <p className="armor-text-caption mb-3" style={{ color: 'var(--text-tertiary)' }}>
          Last: {Math.round(lastEntry.weight / (unit === 'kg' ? 2.20462 : 1))} {unit} × {lastEntry.reps}
        </p>
      )}

      <Card padded={false} className="px-6 py-6 mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="armor-text-caption mb-1">Sets</p>
            <p className="text-2xl font-black text-white">{totalSets}</p>
          </div>
          <div>
            <p className="armor-text-caption mb-1">Reps</p>
            <p className="text-2xl font-black text-cyan-400">{currentEx.reps}</p>
          </div>
          <div>
            <p className="armor-text-caption mb-1">Weight</p>
            {showZeroLbsNudge ? (
              <button
                onClick={() => { HAPTIC.light(); onNavigateToSettings ? onNavigateToSettings() : console.warn('onNavigateToSettings not provided'); }}
                className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 underline"
              >
                Set your 1RM in Settings →
              </button>
            ) : (
              <p className="text-2xl font-black text-white">{Math.round(currentEx.weight / (unit === 'kg' ? 2.20462 : 1))}<span className="text-sm text-slate-400 ml-1">{unit}</span></p>
            )}
          </div>
        </div>
        {!showZeroLbsNudge && unit !== 'kg' && (
          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <PlateVisualizer weight={currentEx.weight} track={track} />
          </div>
        )}
      </Card>

      <div className="flex justify-center gap-2 mb-6">
        {Array.from({ length: totalSets }).map((_, i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${
            i < setNum - 1 ? 'bg-emerald-500 scale-100' :
            i === setNum - 1 ? 'bg-cyan-400 scale-125 shadow-[0_0_8px_rgba(6,182,212,0.5)]' :
            'bg-white/[0.06]'
          }`} />
        ))}
      </div>

      <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="RPE, form notes..."
        className="w-full bg-white/[0.04] rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none mb-6"
      />

      <Button
        variant="primary"
        size="lg"
        icon={<Check size={20} strokeWidth={3} />}
        onClick={handleCompleteSet}
        className={`w-full transition-transform ${justCompleted ? 'scale-95' : ''}`}
      >
        Complete Set {setNum}
      </Button>

      <Button variant="ghost" size="sm" onClick={() => setShowEndConfirm(true)} className="w-full mt-3">
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
          <div className="bg-slate-900 w-full max-w-sm mx-auto p-4 border-t border-white/[0.06]" onClick={e => e.stopPropagation()}>
            <p className="text-sm text-slate-400 mb-3">
              Swap <span className="text-white font-semibold capitalize">{currentEx.exerciseId?.replace(/_/g, ' ')}</span> for:
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
                  className="w-full text-left p-3 rounded-xl hover:bg-white/[0.06] text-white font-medium capitalize"
                >
                  {altId.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowSwap(false)}
              className="w-full p-3 text-slate-500 text-sm font-medium text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── MAIN ──────────────────────────────────────────────────── */
export default function ArmorWorkoutSession({ onComplete, onCancel, onNavigateToSettings }) {
  const { activeModifiers, currentCycle, estimated1RMs, effectiveTrack } = useArmorData();
  const { celebration, setCelebration } = usePRDetection();
  const [showConfetti, setShowConfetti] = useState(false);

  const todayWorkout = useMemo(() =>
    getTodaysWorkout(effectiveTrack, currentCycle.day, currentCycle.week, activeModifiers, estimated1RMs),
    [effectiveTrack, currentCycle.day, currentCycle.week, activeModifiers, estimated1RMs]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--elevation-0-bg)' }}>
      {showConfetti && <ConfettiBurst count={50} />}
      {celebration && <AwardModal achievement={celebration} onDismiss={() => { setShowConfetti(false); setCelebration(null); }} />}

      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <button onClick={() => { HAPTIC.light(); onCancel?.(); }}
          className="armor-press w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center">
          <X size={18} className="text-slate-400" />
        </button>
        <div className="text-center">
          <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest">{todayWorkout.name}</p>
          <p className="text-[10px] text-slate-600">Week {currentCycle.week} · Day {currentCycle.day}</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex">
        {todayWorkout.type === 'vo2max' ? (
          <VO2MaxScreen protocol={VO2MAX_PROTOCOL} onComplete={onComplete} />
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
