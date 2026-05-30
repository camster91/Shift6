import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, Check, X, Dumbbell, Youtube, Plus, Minus, Settings, ChevronRight, RotateCcw } from 'lucide-react';
import { useData } from '../hooks/useData';
import { COLOR_MAP, getExercise } from '../data/exercises';
import { t } from '../i18n';

// ──────────── Rest Settings Modal ────────────
function RestSettingsModal({ currentExId, currentSeconds, onSave, onClose }) {
  const { updateSettings, settings } = useData();
  const [mins, setMins] = useState(Math.floor(currentSeconds / 60));
  const [secs, setSecs] = useState(currentSeconds % 60);

  const handleSave = () => {
    onSave(mins * 60 + secs);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[75] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-1">Rest Time</h3>
        <p className="text-xs text-slate-500 mb-4">Set default rest duration for this exercise</p>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 bg-slate-800 rounded-xl p-2 flex-1">
            <input type="number" min="0" max="10" value={mins}
              onChange={e => setMins(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-12 bg-transparent text-center text-white font-bold text-xl" />
            <span className="text-slate-500 text-sm">min</span>
            <input type="number" min="0" max="59" step="15" value={secs}
              onChange={e => setSecs(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-14 bg-transparent text-center text-white font-bold text-xl" />
            <span className="text-slate-500 text-sm">sec</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 text-slate-400 rounded-xl text-sm font-semibold">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2.5 bg-cyan-500 text-white rounded-xl text-sm font-bold active:scale-95">Save</button>
        </div>
        <button onClick={() => {
            const rt = { ...(settings?.restTimes || {}) };
            delete rt[currentExId];
            updateSettings({ restTimes: rt });
            onClose();
          }}
          className="w-full mt-3 py-2 text-slate-600 text-xs hover:text-slate-400 transition-colors">
          Reset to default rest time
        </button>
      </div>
    </div>
  );
}

// ──────────── Achievement Celebration ────────────
function AchievementPopup({ achievement, onDismiss }) {
  const key = `achievements.${achievement}`;
  const title = t(`${key}.title`);
  const message = t(`${key}.message`);
  const emoji = { first_workout: '🎉', three_day_streak: '🔥', seven_day_streak: '💪', ten_sets: '💯', first_pr: '🏆' }[achievement] || '🏆';
  if (!title || title === key) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 animate-fade-in" onClick={onDismiss}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-slate-900 border border-slate-700 rounded-3xl p-8 text-center max-w-xs w-full shadow-2xl">
        <div className="text-6xl mb-4">{emoji}</div>
        <h3 className="text-xl font-black text-white mb-2">{title}</h3>
        <p className="text-slate-400 text-sm mb-6">{message}</p>
        <button onClick={onDismiss} className="w-full py-3 bg-cyan-500 text-white rounded-xl font-bold active:scale-95 transition-transform">
          {t('workout.keepGoing')}
        </button>
      </div>
    </div>
  );
}

// ──────────── Timer Hook ────────────
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
          try { navigator.vibrate?.([200, 100, 200]); } catch (e) { /* ignore */ }
          return 0;
        }
        const next = prev - 1;
        if (next === 10 || next === 5 || next === 3) {
          try { navigator.vibrate?.(50); } catch (e) { /* ignore */ }
        }
        return next;
      });
    }, 1000);
  }, []);

  const pause = useCallback(() => {
    setRunning(false);
    clearInterval(intervalRef.current);
  }, []);

  const reset = useCallback((seconds) => {
    setRunning(false);
    clearInterval(intervalRef.current);
    setTimeLeft(seconds);
  }, []);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const addTime = useCallback((secs) => {
    setTimeLeft(prev => Math.max(1, prev + secs));
  }, []);

  return { timeLeft, running, start, pause, reset, setTimeLeft, addTime };
}

// ──────────── Video Modal ────────────
function VideoModal({ exercise, onClose }) {
  if (!exercise?.youtubeId) return null;
  return (
    <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4 animate-fade-in"
      role="dialog" aria-modal="true" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Youtube size={18} className="text-red-400" /> {exercise.name}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg"><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="aspect-video bg-black">
          <iframe src={`https://www.youtube.com/embed/${exercise.youtubeId}?rel=0&autoplay=1`}
            className="w-full h-full" allow="accelerometer; autoplay; encrypted-media; gyroscope" allowFullScreen />
        </div>
        <div className="p-4">
          <p className="text-sm text-slate-300">{exercise.instructions}</p>
        </div>
      </div>
    </div>
  );
}

// ──────────── Swap Exercise Modal ────────────
function SwapExerciseModal({ alternatives, onSwap, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-[75] flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-1">Swap Exercise</h3>
        <p className="text-xs text-slate-500 mb-4 font-medium">Choose a substitute exercise for this session</p>
        <div className="space-y-2 max-h-60 overflow-y-auto mb-4 custom-scrollbar">
          {alternatives.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No alternative exercises configured for this body part.</p>
          ) : (
            alternatives.map(alt => (
              <button key={alt.id} onClick={() => onSwap(alt.id)}
                className="w-full text-left p-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-sm transition-colors border border-slate-700/30 flex items-center justify-between active:scale-95">
                <span>{alt.name}</span>
                <span className="text-[10px] text-slate-500 uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/30">{alt.equipment}</span>
              </button>
            ))
          )}
        </div>
        <button onClick={onClose} className="w-full py-2.5 bg-slate-800 text-slate-400 hover:text-slate-300 rounded-xl text-sm font-bold">Cancel</button>
      </div>
    </div>
  );
}

// ──────────── Timer Ring ────────────
function TimerRing({ seconds, colorHex, running }) {
  const initialRef = useRef(Math.max(seconds, 1));
  if (seconds > initialRef.current) initialRef.current = seconds;
  const total = initialRef.current;
  const pct = total > 0 ? Math.max(0, seconds / total) : 0;
  const circ = 2 * Math.PI * 85;
  const offset = circ * (1 - pct);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg width={192} height={192} className="transform -rotate-90">
        <circle cx={96} cy={96} r={85} fill="none" stroke="rgba(30,41,59,0.3)" strokeWidth={10} />
        <circle cx={96} cy={96} r={85} fill="none" stroke={colorHex} strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: running ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.3s ease' }}
          filter={`drop-shadow(0 0 8px ${colorHex}50)`} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className={`text-6xl font-black tabular-nums ${seconds <= 10 ? 'text-orange-400' : 'text-white'}`}>
            {mins}:{secs.toString().padStart(2, '0')}
          </p>
          {running && (
            <p className="text-xs text-slate-500 mt-1 font-bold uppercase tracking-wider">Resting</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────── Rest Screen ────────────
function RestScreen({
  seconds, running, onFinish, onStart, onPause, onAdjustRest,
  nextExercise, colors, currentSet, totalSets, sessionTargetReps, restAdjustmentText
}) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="flex flex-col flex-1 p-6 text-center max-w-sm mx-auto w-full animate-fade-in">
      {/* Next set info */}
      <div className="mb-4">
        <p className="text-xs uppercase font-bold text-slate-500 tracking-widest">{t('workout.rest')}</p>
        <h3 className="text-lg font-black text-white mt-1">
          Next: Set {currentSet} of {totalSets} · <span className={colors.text}>{sessionTargetReps} reps</span>
        </h3>
      </div>

      {restAdjustmentText && (
        <div className="mb-4 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-cyan-400 flex items-center justify-center gap-1.5 animate-pulse">
          {restAdjustmentText}
        </div>
      )}

      {/* Timer */}
      <TimerRing seconds={seconds} colorHex={colors.hex} running={running} />

      {seconds <= 10 && running && (
        <p className="text-orange-400 text-sm font-bold animate-bounce mt-3">Ready up!</p>
      )}

      {/* Adjusters */}
      <div className="flex items-center justify-center gap-2 mt-6">
        <button onClick={() => onAdjustRest(-15)} className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center active:scale-90 transition-all">
          <Minus size={18} className="text-slate-400" />
          <span className="sr-only">-15s</span>
        </button>
        <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider px-2">Adjust</span>
        <button onClick={() => onAdjustRest(15)} className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center active:scale-90 transition-all">
          <Plus size={18} className="text-slate-400" />
          <span className="sr-only">+15s</span>
        </button>
      </div>

      {/* Big done / play controls */}
      <div className="mt-auto">
        <div className="flex items-center justify-center gap-4 mb-6">
          {running ? (
            <button onClick={onPause} className="w-16 h-16 rounded-full bg-slate-800 hover:bg-slate-750 flex items-center justify-center active:scale-90 transition-all border border-slate-700/40">
              <Pause size={24} className="text-white" />
            </button>
          ) : (
            <button onClick={onStart} className="w-16 h-16 rounded-full bg-cyan-500 hover:bg-cyan-400 flex items-center justify-center active:scale-90 transition-all shadow-lg shadow-cyan-500/20">
              <Play size={24} className="text-white fill-current ml-1" />
            </button>
          )}
        </div>

        <button onClick={onFinish} className={`w-full py-4 rounded-2xl font-bold text-lg text-white ${colors.solid} active:scale-95 transition-transform`}>
          START SET {currentSet} <ChevronRight size={20} className="inline" />
        </button>

        {nextExercise && (
          <div className="text-center bg-slate-900/40 border border-slate-900/60 rounded-2xl p-3 w-full mt-4">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">{t('common.next')}</p>
            <div className="flex items-center gap-3 justify-center">
              <div className={`w-8 h-8 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                <Dumbbell size={14} className={colors.text} />
              </div>
              <span className="text-sm font-bold text-white">{nextExercise.name}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────── Workout Session ────────────
export default function WorkoutSession({ exerciseId, onComplete, onCancel, workoutQueue = [], workoutIndex = 0 }) {
  const { logSet, getBestSet, getCurrentStreak, logs, settings, getLastRepsFor, updateSettings, goals, detectPlateauAndOverload, allExercises } = useData();
  const [currentExId, setCurrentExId] = useState(exerciseId);
  const [showSwapModal, setShowSwapModal] = useState(false);

  useEffect(() => { setCurrentExId(exerciseId); }, [exerciseId]);

  const exercise = getExercise(currentExId);
  const colors = COLOR_MAP[exercise?.color] || COLOR_MAP.cyan;

  const alternatives = useMemo(() => (allExercises || []).filter(e =>
    e.bodyPart === exercise?.bodyPart &&
    e.id !== currentExId &&
    (settings?.equippedIds || ['none']).includes(e.equipment)
  ), [allExercises, exercise?.bodyPart, currentExId, settings?.equippedIds]);

  const [phase, setPhase] = useState('active');
  const [currentSet, setCurrentSet] = useState(1);
  const [setsCompleted, setSetsCompleted] = useState([]);
  const [currentReps, setCurrentReps] = useState(exercise?.startReps || 10);
  const [currentWeight, setCurrentWeight] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [showRestModal, setShowRestModal] = useState(false);
  const [bestReps, setBestReps] = useState(0);
  const [achievement, setAchievement] = useState(null);
  const [failed, setFailed] = useState(false);
  const [notes, setNotes] = useState('');

  const [sessionTargetReps, setSessionTargetReps] = useState(exercise?.startReps || 10);
  const [autoRegulated, setAutoRegulated] = useState(false);
  const [restAdjustmentText, setRestAdjustmentText] = useState('');
  const [coachReport, setCoachReport] = useState(null);

  // Reset state when exercise changes
  useEffect(() => {
    setPhase('active');
    setCurrentSet(1);
    setSetsCompleted([]);
    setCurrentWeight(0);
    const calibrated = settings?.calibratedStartReps?.[currentExId];
    const last = getLastRepsFor(currentExId);
    const startReps = calibrated ?? (last > 0 ? last : (exercise?.startReps || 10));
    setCurrentReps(startReps);
    setSessionTargetReps(startReps);
    setAutoRegulated(false);
    setRestAdjustmentText('');
    setCoachReport(null);
    setShowRestModal(false);
    setAchievement(null);
    setFailed(false);
    setNotes('');
    const best = getBestSet(currentExId);
    setBestReps(best);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExId]);

  const targetSets = settings?.targetSets ?? 3;
  const restSeconds = settings?.restTimes?.[currentExId] ?? settings?.restSeconds ?? 90;
  const timer = useTimer(restSeconds);

  const nextExerciseInQueue = workoutQueue.length > 1 && workoutIndex < workoutQueue.length - 1
    ? getExercise(workoutQueue[workoutIndex + 1])
    : null;

  const prevLogCount = useRef(logs.length);
  useEffect(() => { prevLogCount.current = logs.length; }, [logs]);

  useEffect(() => { const best = getBestSet(currentExId); setBestReps(best); }, [currentExId, logs, getBestSet]);

  useEffect(() => {
    let wakeLock = null;
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(wl => wakeLock = wl).catch(e => { console.debug('[wakeLock] not available:', e.message); });
    }
    return () => wakeLock?.release();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); handleCancel(); }
      if (e.key === 'Enter' && phase === 'active') { e.preventDefault(); handleCompleteSet(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, handleCancel, handleCompleteSet]);

  useEffect(() => {
    if (phase === 'rest' && timer.timeLeft === 0 && timer.running) {
      timer.pause();
      setPhase('active');
    }
  }, [phase, timer.timeLeft, timer.running, timer]);

  const adjustReps = useCallback((delta) => { setCurrentReps(prev => Math.max(0, prev + delta)); }, []);
  const adjustWeight = useCallback((delta) => { setCurrentWeight(prev => Math.max(0, prev + delta)); }, []);

  const handleCompleteSet = useCallback(() => {
    const entry = { reps: currentReps, weight: currentWeight, failed, notes };
    setSetsCompleted(prev => [...prev, entry]);

    const newLogCount = logs.length + setsCompleted.length + 1;
    const prevBest = getBestSet(currentExId);
    const streak = getCurrentStreak();

    logSet(currentExId, currentReps, currentWeight, notes);
    navigator.vibrate?.(100);

    if (setsCompleted.length === 0) {
      if (prevLogCount.current === 0) { setAchievement('first_workout'); }
      else if (currentReps > prevBest && prevBest > 0) { setAchievement('first_pr'); }
      else if (streak >= 7) { setAchievement('seven_day_streak'); }
      else if (streak >= 3) { setAchievement('three_day_streak'); }
    } else if (newLogCount >= 10 && prevLogCount.current < 10) {
      setAchievement('ten_sets');
    }

    const pr = bestReps || prevBest || 0;
    let nextRestTime = restSeconds;
    let restTxt = '';

    if (pr > 0) {
      if (currentReps >= pr) {
        nextRestTime = restSeconds + 30;
        restTxt = 'PR matched/beaten! +30s rest for recovery.';
      } else if (currentReps < pr * 0.6) {
        nextRestTime = Math.max(15, restSeconds - 20);
        restTxt = 'Warm-up level. -20s rest to keep momentum.';
      }
    }
    setRestAdjustmentText(restTxt);

    let nextTarget = sessionTargetReps;
    if (currentReps < sessionTargetReps * 0.75) {
      nextTarget = currentReps;
      setSessionTargetReps(currentReps);
      setAutoRegulated(true);
    }
    setCurrentReps(nextTarget);
    setFailed(false);
    setNotes('');

    if (currentSet >= targetSets) {
      setPhase('done');
    } else {
      setCurrentSet(prev => prev + 1);
      setPhase('rest');
      timer.reset(nextRestTime);
      timer.start();
    }
  }, [currentSet, currentReps, currentWeight, currentExId, logs, setsCompleted, targetSets, restSeconds, getBestSet, getCurrentStreak, logSet, timer, bestReps, sessionTargetReps, failed, notes]);

  const handleFinishRest = useCallback(() => {
    timer.pause();
    setPhase('active');
  }, [timer]);

  const handleAdjustRest = useCallback((delta) => {
    timer.addTime(delta);
    if (!timer.running) timer.start();
    navigator.vibrate?.(20);
  }, [timer]);

  const handleSaveRestTime = useCallback((seconds) => {
    updateSettings({ restTimes: { ...(settings?.restTimes || {}), [currentExId]: seconds } });
    timer.reset(seconds);
    setShowRestModal(false);
    navigator.vibrate?.(30);
  }, [settings, currentExId, timer, updateSettings]);

  const handleSwapExercise = useCallback((newExerciseId) => {
    setCurrentExId(newExerciseId);
    setShowSwapModal(false);
    navigator.vibrate?.(30);
  }, []);

  const handleCancel = useCallback(() => {
    if (setsCompleted.length > 0) {
      const avgReps = Math.round(setsCompleted.reduce((sum, s) => sum + s.reps, 0) / setsCompleted.length);
      const lastBest = getBestSet(currentExId);
      const demonstrated = Math.max(avgReps, lastBest, exercise?.startReps || 10);
      const newBaseline = Math.round(demonstrated * 0.65);
      const currentCalib = settings?.calibratedStartReps?.[currentExId] ?? exercise?.startReps ?? 10;
      if (newBaseline !== currentCalib) {
        updateSettings({ calibratedStartReps: { ...(settings?.calibratedStartReps || {}), [currentExId]: newBaseline } });
      }
      onComplete?.({ exerciseId: currentExId, sets: setsCompleted });
    } else {
      onCancel?.();
    }
  }, [setsCompleted, currentExId, exercise, settings, getBestSet, updateSettings, onCancel, onComplete]);

  useEffect(() => {
    if (phase === 'done' && setsCompleted.length > 0 && !coachReport) {
      const result = detectPlateauAndOverload(currentExId, setsCompleted);
      setCoachReport(result);
    }
  }, [phase, setsCompleted, currentExId, detectPlateauAndOverload, coachReport]);

  if (!exercise) return <div className="fixed inset-0 bg-slate-950 z-50 flex items-center justify-center text-slate-400">{t('workout.exerciseNotFound')}</div>;

  // Common quick-rep presets based on current value
  const quickPresets = useMemo(() => {
    const base = currentReps;
    return [-5, -2, -1, 1, 2, 5].map(v => base + v).filter(v => v > 0);
  }, [currentReps]);

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <button
          onClick={handleCancel}
          aria-label="Cancel workout"
          className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center active:scale-90 transition-transform focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none"
        >
          <X size={18} className="text-slate-400" />
        </button>
        <div className="text-center flex-1 px-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{exercise.bodyPart}</p>
          <h2 className="text-lg font-black text-white leading-tight">{exercise.name}</h2>
          {workoutQueue.length > 1 && (
            <p className="text-[10px] text-slate-600 mt-0.5">{workoutIndex + 1} of {workoutQueue.length}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {workoutQueue.length > 1 && (
            <button onClick={() => onComplete?.({ exerciseId: currentExId, sets: setsCompleted })}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-300 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 active:scale-90 transition-all focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none">
              SAVE & SKIP
            </button>
          )}
          <button
            onClick={() => setShowRestModal(true)}
            aria-label="Rest settings"
            className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center active:scale-90 transition-transform focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none"
          >
            <Settings size={16} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* ─── Set Progress Dots ─── */}
      <div className="flex items-center justify-center gap-2 py-2 shrink-0">
        {Array.from({ length: targetSets }).map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all ${
            i < setsCompleted.length
              ? `${colors.solid} w-6`
              : i === setsCompleted.length
              ? `bg-slate-700 w-6 animate-pulse`
              : `bg-slate-800 w-3`
          }`} />
        ))}
        {currentSet > targetSets && (
          <div className={`h-1.5 rounded-full ${colors.solid} w-6 animate-pulse`} />
        )}
      </div>

      {/* ─── Active Phase ─── */}
      {phase === 'active' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Primary content: massive rep display */}
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            {/* Weight display (if gym exercise) */}
            {!exercise.home && (
              <div className="mb-4 flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-2">
                <button onClick={() => adjustWeight(-2.5)}
                  className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center active:scale-90 transition-transform">
                  <Minus size={16} className="text-slate-400" />
                </button>
                <div className="text-center min-w-[80px]">
                  <p className="text-3xl font-black text-white tabular-nums">{currentWeight}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{settings?.unit || 'lbs'}</p>
                </div>
                <button onClick={() => adjustWeight(2.5)}
                  className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center active:scale-90 transition-transform">
                  <Plus size={16} className="text-slate-400" />
                </button>
                <button onClick={() => adjustWeight(5)}
                  className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center active:scale-90 transition-transform text-slate-500 text-xs font-black">
                  +5
                </button>
              </div>
            )}

            {/* Big rep count */}
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => adjustReps(-1)}
                aria-label="Decrease reps"
                className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center active:scale-90 transition-transform shrink-0 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none"
              >
                <Minus size={24} className="text-slate-400" />
              </button>
              <div className="text-center min-w-[140px]">
                <p className="text-8xl font-black text-white tabular-nums leading-none">{currentReps}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                  {exercise.unit || t('common.reps')}
                </p>
              </div>
              <button
                onClick={() => adjustReps(1)}
                aria-label="Increase reps"
                className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center active:scale-90 transition-transform shrink-0 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none"
              >
                <Plus size={24} className="text-slate-400" />
              </button>
            </div>

            {/* Quick rep presets */}
            <div className="flex items-center gap-1.5 mt-3 flex-wrap justify-center max-w-xs">
              {[-5, -2, -1, 1, 2, 5].map(val => (
                <button key={val} onClick={() => adjustReps(val)}
                  className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 font-black text-xs active:scale-90 transition-transform">
                  {val > 0 ? `+${val}` : val}
                </button>
              ))}
            </div>

            {/* Last / Target info */}
            <div className="mt-4 text-center">
              {bestReps > 0 && (
                <p className="text-xs text-slate-600 font-semibold">
                  Personal best: <span className="text-slate-400">{bestReps}</span>
                </p>
              )}
              {autoRegulated && (
                <p className="text-[10px] text-orange-400 mt-1 font-medium">Target auto-adjusted to match capability</p>
              )}
            </div>

            {/* Failed toggle */}
            <button
              onClick={() => setFailed(f => !f)}
              className={`mt-3 px-4 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                failed
                  ? 'bg-red-500/20 border-red-500/30 text-red-400'
                  : 'bg-slate-900 border-slate-800 text-slate-600 hover:text-slate-400'
              }`}
            >
              {failed ? 'Marking as failed / assisted' : 'Mark as failed / assisted'}
            </button>

            {/* Notes */}
            {failed && (
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Note (e.g. spotter assisted, left shoulder tight)"
                className="mt-2 w-full max-w-xs bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-slate-700"
              />
            )}
          </div>

          {/* Bottom action bar */}
          <div className="shrink-0 p-4 pb-6 space-y-3">
            {/* Primary done button */}
            <button
              onClick={handleCompleteSet}
              className={`w-full py-5 rounded-2xl font-black text-xl text-white ${colors.solid} active:scale-95 transition-transform flex items-center justify-center gap-3 shadow-lg`}
              style={{ minHeight: 72 }}
            >
              <Check size={28} />
              <span>{failed ? 'LOG AS FAILED' : `DONE — SET ${currentSet}`}</span>
            </button>

            {/* Secondary actions */}
            <div className="flex items-center justify-center gap-2">
              {exercise?.youtubeId && (
                <button onClick={() => setShowVideo(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-500 hover:text-red-400 transition-colors active:scale-95">
                  <Youtube size={12} /> DEMO
                </button>
              )}
              <button onClick={() => setShowSwapModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-500 hover:text-cyan-400 transition-colors active:scale-95">
                <RotateCcw size={12} /> SWAP
              </button>
            </div>

            {/* Instructions */}
            {exercise?.instructions && (
              <p className="text-[10px] text-slate-700 text-center leading-relaxed max-w-xs mx-auto">
                {exercise.instructions}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── Rest Phase ─── */}
      {phase === 'rest' && (
        <RestScreen
          seconds={timer.timeLeft}
          running={timer.running}
          onStart={timer.start}
          onPause={timer.pause}
          onFinish={handleFinishRest}
          onAdjustRest={handleAdjustRest}
          nextExercise={nextExerciseInQueue}
          colors={colors}
          currentSet={currentSet}
          totalSets={targetSets}
          sessionTargetReps={sessionTargetReps}
          restAdjustmentText={restAdjustmentText}
        />
      )}

      {/* ─── Done Phase ─── */}
      {phase === 'done' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
            <Check size={36} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">{exercise.name}</h2>
          <p className="text-slate-400 mb-4">{t('workout.workoutComplete')}</p>

          {coachReport && (
            <div className={`w-full max-w-xs border rounded-2xl p-4 mb-6 text-left ${
              coachReport.status === 'overload' ? 'bg-amber-500/10 border-amber-500/30' :
              coachReport.status === 'deload' ? 'bg-orange-500/10 border-orange-500/30' :
              coachReport.status === 'plateau_warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
              'bg-cyan-500/10 border-cyan-500/20'
            }`}>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Coach Report</p>
              <h4 className="text-sm font-bold text-white mb-1">
                {coachReport.status === 'overload' ? 'New PR!' :
                 coachReport.status === 'deload' ? 'Deload Active' :
                 coachReport.status === 'plateau_warning' ? `Plateau (${coachReport.count}/3)` :
                 'On Track'}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {coachReport.status === 'overload' ? `+${coachReport.diff} rep PR of ${coachReport.value}!` :
                 coachReport.status === 'deload' ? `Baseline lowered to ${coachReport.currentReps} for recovery.` :
                 coachReport.status === 'plateau_warning' ? 'Push harder next session to break through.' :
                 'Solid consistency. Keep stacking sessions.'}
              </p>
            </div>
          )}

          <div className="glass-card rounded-xl p-4 w-full max-w-xs mb-6 text-left">
            {setsCompleted.map((s, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
                <div className="flex items-center gap-2">
                  {s.failed && <span className="text-[9px] font-bold text-red-500 uppercase">Fail</span>}
                  <span className="text-slate-400 text-sm">Set {i + 1}</span>
                </div>
                <div className="text-right">
                  <span className="text-white font-bold text-sm">
                    {s.reps} {t('common.reps')}{s.weight ? ` · ${s.weight} ${t('common.lbs')}` : ''}
                  </span>
                  {s.notes && <p className="text-[9px] text-slate-600">{s.notes}</p>}
                </div>
              </div>
            ))}
          </div>

          {setsCompleted.length < targetSets && (
            <p className="text-xs text-slate-500 mb-4">Shortened session — great job finishing!</p>
          )}

          <button onClick={handleCancel}
            className="w-full max-w-xs py-4 rounded-2xl font-bold bg-cyan-500 text-white active:scale-95 transition-transform shadow-lg">
            {t('common.done')}
          </button>
        </div>
      )}

      {/* ─── Overlays ─── */}
      {showVideo && <VideoModal exercise={exercise} onClose={() => setShowVideo(false)} />}
      {achievement && <AchievementPopup achievement={achievement} onDismiss={() => setAchievement(null)} />}
      {showRestModal && <RestSettingsModal currentExId={currentExId} currentSeconds={restSeconds} onSave={handleSaveRestTime} onClose={() => setShowRestModal(false)} />}
      {showSwapModal && <SwapExerciseModal alternatives={alternatives} onSwap={handleSwapExercise} onClose={() => setShowSwapModal(false)} />}
    </div>
  );
}
