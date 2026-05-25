import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Check, X, Dumbbell, Youtube, Plus, Minus, Settings } from 'lucide-react';
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
        <button
          onClick={onDismiss}
          className="w-full py-3 bg-cyan-500 text-white rounded-xl font-bold active:scale-95 transition-transform"
        >
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
              <button
                key={alt.id}
                onClick={() => onSwap(alt.id)}
                className="w-full text-left p-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-sm transition-colors border border-slate-700/30 flex items-center justify-between active:scale-95"
              >
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

// ──────────── Rest Screen ────────────
function RestScreen({
  seconds,
  running,
  onFinish,
  onStart,
  onPause,
  onAdjustRest,
  nextExercise,
  colors,
  currentSet,
  totalSets,
  sessionTargetReps,
  restAdjustmentText
}) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6 text-center max-w-sm mx-auto w-full animate-fade-in">
      <div className="mb-4">
        <span className="text-xs uppercase font-bold text-slate-500 tracking-widest">{t('workout.rest')}</span>
        <h3 className="text-lg font-black text-white mt-1">
          Next Up: Set {currentSet} of {totalSets} · <span className={colors.text}>{sessionTargetReps} reps</span>
        </h3>
      </div>

      {restAdjustmentText && (
        <div className="mb-6 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-805 text-xs font-semibold text-cyan-400 flex items-center justify-center gap-1.5 animate-pulse">
          {restAdjustmentText}
        </div>
      )}

      <div className="relative mb-6">
        <div className={`w-40 h-40 rounded-full border-4 flex items-center justify-center transition-all ${seconds <= 10 ? 'border-orange-500/50 shadow-lg shadow-orange-500/5' : 'border-slate-800'}`}>
          <span className={`text-4xl font-black ${seconds <= 10 ? 'text-orange-400' : 'text-white'}`}>{mins}:{secs.toString().padStart(2, '0')}</span>
        </div>
        {seconds <= 10 && (
          <p className="text-center text-orange-400 text-xs mt-2 font-bold animate-bounce">Ready up!</p>
        )}
      </div>

      {/* Rest adjusters */}
      <div className="flex items-center gap-3 mb-8 bg-slate-900 border border-slate-800/80 px-4 py-2 rounded-2xl">
        <button onClick={() => onAdjustRest(-15)} className="px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 active:scale-90 text-slate-400 font-bold text-xs border border-slate-700/30 transition-all flex items-center">
          <Minus size={12} className="mr-0.5" /> 15s
        </button>
        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Adjust Rest</span>
        <button onClick={() => onAdjustRest(15)} className="px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 active:scale-90 text-slate-400 font-bold text-xs border border-slate-700/30 transition-all flex items-center">
          <Plus size={12} className="mr-0.5" /> 15s
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 w-full justify-center mb-8">
        {running ? (
          <button onClick={onPause} className="w-14 h-14 rounded-full bg-slate-800 hover:bg-slate-750 flex items-center justify-center active:scale-90 transition-all border border-slate-700/40">
            <Pause size={22} className="text-white" />
          </button>
        ) : (
          <button onClick={onStart} className="w-14 h-14 rounded-full bg-cyan-500 hover:bg-cyan-400 flex items-center justify-center active:scale-90 transition-all shadow-lg shadow-cyan-500/20">
            <Play size={22} className="text-white fill-current ml-1" />
          </button>
        )}
        <button onClick={onFinish} className={`px-8 py-3.5 rounded-xl font-bold ${colors.solid} text-white active:scale-95 transition-all shadow-md`}>
          {t('workout.skip')}
        </button>
      </div>

      {nextExercise && (
        <div className="text-center bg-slate-900/40 border border-slate-900/60 rounded-2xl p-3 w-full">
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
  );
}

// ──────────── Workout Session ────────────
export default function WorkoutSession({ exerciseId, onComplete, onCancel, workoutQueue = [], workoutIndex = 0 }) {
  const { logSet, getBestSet, getCurrentStreak, logs, settings, getLastRepsFor, updateSettings, goals, detectPlateauAndOverload, allExercises } = useData();
  const [currentExId, setCurrentExId] = useState(exerciseId);
  const [showSwapModal, setShowSwapModal] = useState(false);

  useEffect(() => {
    setCurrentExId(exerciseId);
  }, [exerciseId]);

  const exercise = getExercise(currentExId);
  const colors = COLOR_MAP[exercise?.color] || COLOR_MAP.cyan;
  
  const alternatives = (allExercises || []).filter(e => 
    e.bodyPart === exercise?.bodyPart && 
    e.id !== currentExId && 
    (settings?.equippedIds || ['none']).includes(e.equipment)
  );

  const [phase, setPhase] = useState('active'); // active | rest | done | choosing
  const [currentSet, setCurrentSet] = useState(1);
  const [setsCompleted, setSetsCompleted] = useState([]);
  const [currentReps, setCurrentReps] = useState(exercise?.startReps || 10);
  const [currentWeight, setCurrentWeight] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [showRestModal, setShowRestModal] = useState(false);
  const [bestReps, setBestReps] = useState(0);
  const [achievement, setAchievement] = useState(null);

  // Virtual Coach State
  const [sessionTargetReps, setSessionTargetReps] = useState(exercise?.startReps || 10);
  const [autoRegulated, setAutoRegulated] = useState(false);
  const [restAdjustmentText, setRestAdjustmentText] = useState('');
  const [coachReport, setCoachReport] = useState(null);

  // Reset state when exercise changes (queue advance or swap)
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
    // Keep bestReps fresh
    const best = getBestSet(currentExId);
    setBestReps(best);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExId]);

  const targetSets = settings?.targetSets ?? 3;
  const restSeconds = settings?.restTimes?.[currentExId] ?? settings?.restSeconds ?? 90;
  const timer = useTimer(restSeconds);

  // Determine next exercise in queue for rest screen preview
  const nextExerciseInQueue = workoutQueue.length > 1 && workoutIndex < workoutQueue.length - 1
    ? getExercise(workoutQueue[workoutIndex + 1])
    : null;

  // Snapshot log count before this workout (for achievement detection)
  const prevLogCount = useRef(logs.length);

  useEffect(() => {
    const best = getBestSet(currentExId);
    setBestReps(best);
  }, [currentExId, logs, getBestSet]);

  // Wake lock
  useEffect(() => {
    let wakeLock = null;
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(wl => wakeLock = wl).catch(e => { console.debug('[wakeLock] not available:', e.message); });
    }
    return () => wakeLock?.release();
  }, []);

  const adjustReps = useCallback((delta) => {
    setCurrentReps(prev => Math.max(0, prev + delta));
  }, []);

  const adjustWeight = useCallback((delta) => {
    setCurrentWeight(prev => Math.max(0, prev + delta));
  }, []);

  // Complete a set → start rest
  const handleCompleteSet = useCallback(() => {
    const entry = { reps: currentReps, weight: currentWeight };
    setSetsCompleted(prev => [...prev, entry]);

    const newLogCount = logs.length + setsCompleted.length + 1; // +1 for this set
    const prevBest = getBestSet(currentExId);
    const streak = getCurrentStreak();

    logSet(currentExId, currentReps, currentWeight);

    navigator.vibrate?.(100);

    // Check achievements on first set completion
    if (setsCompleted.length === 0) {
      if (prevLogCount.current === 0) {
        setAchievement('first_workout');
      } else if (currentReps > prevBest && prevBest > 0) {
        setAchievement('first_pr');
      } else if (streak >= 7) {
        setAchievement('seven_day_streak');
      } else if (streak >= 3) {
        setAchievement('three_day_streak');
      }
    } else if (newLogCount >= 10 && prevLogCount.current < 10) {
      setAchievement('ten_sets');
    }

    // Adaptive rest duration calculations
    const pr = bestReps || prevBest || 0;
    let nextRestTime = restSeconds;
    let restTxt = '';
    
    if (pr > 0) {
      if (currentReps >= pr) {
        nextRestTime = restSeconds + 30;
        restTxt = '🔥 PR matched/beaten! +30s rest for recovery.';
      } else if (currentReps < pr * 0.6) {
        nextRestTime = Math.max(15, restSeconds - 20);
        restTxt = '⚡ Warm-up level. -20s rest to keep momentum.';
      }
    }
    setRestAdjustmentText(restTxt);

    // Auto-Regulation checks
    let nextTarget = sessionTargetReps;
    if (currentReps < sessionTargetReps * 0.75) {
      nextTarget = currentReps;
      setSessionTargetReps(currentReps);
      setAutoRegulated(true);
    }
    setCurrentReps(nextTarget);

    // If past target sets, stay in active phase (user can keep going or finish)
    if (currentSet >= targetSets) {
      setPhase('done');
    } else {
      setCurrentSet(prev => prev + 1);
      setPhase('rest');
      timer.reset(nextRestTime);
      timer.start();
    }
  }, [currentSet, currentReps, currentWeight, currentExId, logs, setsCompleted, targetSets, restSeconds, getBestSet, getCurrentStreak, logSet, timer, bestReps, sessionTargetReps]);

  // Finish rest → back to active
  const handleFinishRest = useCallback(() => {
    timer.pause();
    setPhase('active');
  }, [timer]);

  // Adjust rest time from buttons
  const handleAdjustRest = useCallback((delta) => {
    timer.addTime(delta);
    if (!timer.running) timer.start();
    navigator.vibrate?.(20);
  }, [timer]);

  // Save custom rest time for this exercise
  const handleSaveRestTime = useCallback((seconds) => {
    updateSettings({
      restTimes: { ...(settings?.restTimes || {}), [currentExId]: seconds }
    });
    timer.reset(seconds);
    setShowRestModal(false);
    navigator.vibrate?.(30);
  }, [settings, currentExId, timer, updateSettings]);

  // Swap exercise handler
  const handleSwapExercise = useCallback((newExerciseId) => {
    setCurrentExId(newExerciseId);
    setShowSwapModal(false);
    navigator.vibrate?.(30);
  }, []);

  // Cancel / Done
  const handleCancel = useCallback(() => {
    if (setsCompleted.length > 0) {
      const avgReps = Math.round(setsCompleted.reduce((sum, s) => sum + s.reps, 0) / setsCompleted.length);
      const lastBest = getBestSet(currentExId);
      const demonstrated = Math.max(avgReps, lastBest, exercise?.startReps || 10);
      const newBaseline = Math.round(demonstrated * 0.65);
      const currentCalib = settings?.calibratedStartReps?.[currentExId] ?? exercise?.startReps ?? 10;
      if (newBaseline !== currentCalib) {
        updateSettings({
          calibratedStartReps: { ...(settings?.calibratedStartReps || {}), [currentExId]: newBaseline }
        });
      }
      onComplete?.({ exerciseId: currentExId, sets: setsCompleted });
    } else {
      onCancel?.();
    }
  }, [setsCompleted, currentExId, exercise, settings, getBestSet, updateSettings, onCancel, onComplete]);

  // Run Virtual Coach report generation when done
  useEffect(() => {
    if (phase === 'done' && setsCompleted.length > 0 && !coachReport) {
      const result = detectPlateauAndOverload(currentExId, setsCompleted);
      setCoachReport(result);
    }
  }, [phase, setsCompleted, currentExId, detectPlateauAndOverload, coachReport]);

  if (!exercise) return <div className="fixed inset-0 bg-slate-950 z-50 flex items-center justify-center text-slate-400">{t('workout.exerciseNotFound')}</div>;

  const renderTargetHUD = () => {
    const goal = goals?.find(g => g.exerciseId === currentExId);
    const best = bestReps || 0;
    
    let message = `Target: ${sessionTargetReps} reps`;
    let badgeText = "Growth Target";
    
    if (goal && sessionTargetReps >= goal.targetReps) {
      message = `Goal Target: ${goal.targetReps} reps! You're matching your goal.`;
      badgeText = "Goal Reached";
    } else if (best > 0 && sessionTargetReps >= best) {
      message = `PR Target: ${best + 1} reps to set a new record!`;
      badgeText = "Record Chase";
    } else if (goal) {
      message = `Coach Target: ${sessionTargetReps} reps (+1 for growth)`;
      badgeText = "Growth";
    } else if (best > 0) {
      message = `Coach Target: ${sessionTargetReps} reps. PR is ${best}.`;
      badgeText = "PR Chase";
    } else {
      message = `Coach Target: ${sessionTargetReps} reps. Establish your baseline!`;
      badgeText = "Baseline";
    }

    return (
      <div className="w-full max-w-xs bg-slate-900/80 border border-slate-800 rounded-xl p-3 mb-6 text-center animate-fade-in">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Set {currentSet} target</span>
          <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{badgeText}</span>
        </div>
        <p className="text-sm font-semibold text-slate-200">{message}</p>
        {autoRegulated && (
          <p className="text-[10px] text-orange-400 mt-1 font-medium">⚠️ Auto-regulated: targets lowered to match capability</p>
        )}
      </div>
    );
  };

  const renderCoachReportSection = () => {
    if (!coachReport) return null;
    
    let title = "Session Completed";
    let desc = "Consistency is the key to progress. Outstanding job showing up today!";
    let bg = "bg-slate-900 border-slate-800";
    let textCol = "text-slate-300";
    let badge = null;
    
    switch (coachReport.status) {
      case 'overload':
        title = "Progressive Overload Achieved! 🏆";
        desc = `You set a new Personal Record of ${coachReport.value} reps (+${coachReport.diff} improvement)! Growth stimulus unlocked.`;
        bg = "bg-amber-500/10 border-amber-500/30";
        textCol = "text-amber-200";
        badge = "New PR";
        break;
      case 'deload':
        title = "Plateau Break: Deload Phase 🔄";
        desc = `We detected a plateau. Baseline auto-calibrated to ${coachReport.currentReps} reps (-15%) for active recovery. Build back stronger!`;
        bg = "bg-orange-500/10 border-orange-500/30";
        textCol = "text-orange-200";
        badge = "Deload Active";
        break;
      case 'plateau_warning':
        title = `Plateau Warning (${coachReport.count}/3) ⚠️`;
        desc = "Performance is holding flat. Push hard next session to break through, or we will trigger an active recovery deload.";
        bg = "bg-yellow-500/10 border-yellow-500/30";
        textCol = "text-yellow-200";
        badge = "Plateau Watch";
        break;
      case 'stable':
        title = "Consistency Solidified! ⚡";
        desc = "You hit your target volumes cleanly. Keep stacking these sessions to lay the foundation for progressive growth.";
        bg = "bg-cyan-500/10 border-cyan-500/20";
        textCol = "text-cyan-200";
        badge = "On Track";
        break;
      default:
        break;
    }

    return (
      <div className={`w-full max-w-xs border rounded-2xl p-4 mb-6 text-left ${bg} animate-fade-in`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Virtual Coach Report</span>
          {badge && (
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-750">
              {badge}
            </span>
          )}
        </div>
        <h4 className="text-sm font-bold text-white mb-1.5">{title}</h4>
        <p className={`text-xs leading-relaxed ${textCol}`}>{desc}</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <button onClick={handleCancel} className="text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
        <div className="text-center">
          <p className="text-xs text-slate-500">{exercise.bodyPart}</p>
          <h2 className="font-bold text-white">{exercise.name}</h2>
          {workoutQueue.length > 1 && (
            <p className="text-[10px] text-slate-600">{workoutIndex + 1} of {workoutQueue.length}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {workoutQueue.length > 1 && (
            <button
              onClick={() => {
                onComplete?.({ exerciseId, sets: setsCompleted });
              }}
              className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold px-2 py-1 rounded-lg bg-cyan-500/10"
            >
              Skip
            </button>
          )}
          <button onClick={() => setShowRestModal(true)} className="text-slate-400 hover:text-cyan-400 transition-colors p-1">
            <Settings size={18} />
          </button>
        </div>
      </div>

      {phase === 'active' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {renderTargetHUD()}

          {/* Progress ring */}
          <div className="relative mb-6">
            <svg width={200} height={200} className="transform -rotate-90">
              <circle cx={100} cy={100} r={85} fill="none" stroke="rgba(30,41,59,0.3)" strokeWidth={8} />
              <circle cx={100} cy={100} r={85} fill="none" stroke={colors.hex} strokeWidth={8}
                strokeDasharray={534} strokeDashoffset={534 * (1 - (currentSet - 1) / targetSets)}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                filter={`drop-shadow(0 0 6px ${colors.hex}40)`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-4xl font-black text-white">{currentReps}</p>
                <p className="text-sm text-slate-400">{t('common.reps')}</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-500 mb-6">{t('common.set')} {currentSet} {t('workout.setOf')} {targetSets}</p>

          {/* Rep counter */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex flex-col items-center">
              <button onClick={() => adjustReps(-1)}
                className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center active:scale-90 transition-transform">
                <Minus size={20} className="text-slate-400" />
              </button>
              <span className="text-[10px] text-slate-600 mt-1">−1</span>
            </div>
            <div className="text-center px-4">
              <p className="text-5xl font-black text-white">{currentReps}</p>
              <p className="text-sm text-slate-400 mt-1">{t('common.reps')}</p>
            </div>
            <div className="flex flex-col items-center">
              <button onClick={() => adjustReps(1)}
                className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center active:scale-90 transition-transform">
                <Plus size={20} className="text-slate-400" />
              </button>
              <span className="text-[10px] text-slate-600 mt-1">+1</span>
            </div>
          </div>

          {/* Quick adjustment buttons */}
          <div className="flex items-center justify-center gap-1.5 mb-6 flex-wrap max-w-xs">
            {[-5, -2, -1, 1, 2, 5].map(val => (
              <button key={val} onClick={() => adjustReps(val)}
                className="w-10 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 font-black text-xs active:scale-90 transition-transform">
                {val > 0 ? `+${val}` : val}
              </button>
            ))}
          </div>

          {/* Weight input (gym exercises) */}
          {!exercise.home && (
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => adjustWeight(-2.5)} className="p-2 rounded-lg bg-slate-800 text-slate-400 active:scale-90 text-sm font-bold">−2.5</button>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{currentWeight}</p>
                <p className="text-xs text-slate-500">lbs</p>
              </div>
              <button onClick={() => adjustWeight(2.5)} className="p-2 rounded-lg bg-slate-800 text-slate-400 active:scale-90 text-sm font-bold">+2.5</button>
              <button onClick={() => adjustWeight(5)} className="p-2 rounded-lg bg-slate-700 text-slate-500 active:scale-90 text-xs">+5</button>
            </div>
          )}

          {/* Complete Set */}
          <button onClick={handleCompleteSet}
            className={`w-full max-w-xs py-4 rounded-xl font-bold text-lg text-white ${colors.solid}
              active:scale-95 transition-transform flex items-center justify-center gap-2`}>
            <Check size={20} /> {t('workout.completeSet')}
          </button>

          {/* Add Extra Set (after completing target sets) */}
          {currentSet > targetSets && (
            <button onClick={() => {
              setCurrentSet(prev => prev + 1);
              setPhase('active');
            }}
              className="text-xs text-cyan-400 hover:text-cyan-300 mt-3 flex items-center gap-1">
              <Plus size={12} /> Add extra set
            </button>
          )}

          {/* Best */}
          {bestReps > 0 && (
            <p className="text-xs text-slate-500 mt-4">{t('common.best')}: {bestReps} {t('common.reps')}</p>
          )}

          {/* Exercise instructions */}
          {exercise?.instructions && (
            <p className="text-xs text-slate-600 mt-2 max-w-xs text-center">{exercise.instructions}</p>
          )}

          {exercise?.youtubeId && (
            <button onClick={() => setShowVideo(true)}
              className="flex items-center gap-1.5 text-xs text-red-400/60 hover:text-red-400 mt-2 transition-colors">
              <Youtube size={12} /> Watch demo
            </button>
          )}

          {/* Swap exercise */}
          <button onClick={() => setShowSwapModal(true)}
            className="flex items-center gap-1.5 text-xs text-cyan-500 hover:text-cyan-400 mt-4 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-semibold active:scale-95 transition-all">
            Swap exercise
          </button>
        </div>
      )}

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

      {phase === 'done' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
            <Check size={36} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">{exercise.name}</h2>
          <p className="text-slate-400 mb-4">{t('workout.workoutComplete')}</p>
          
          {renderCoachReportSection()}

          <div className="glass-card rounded-xl p-4 w-full max-w-xs mb-6 text-left">
            {setsCompleted.map((s, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-slate-800 last:border-0">
                <span className="text-slate-400">{t('workout.set')} {i + 1}</span>
                <span className="text-white font-bold">{s.reps} {t('common.reps')}{s.weight ? ` · ${s.weight} ${t('common.lbs')}` : ''}</span>
              </div>
            ))}
          </div>
          {setsCompleted.length < targetSets && (
            <p className="text-xs text-slate-500 mb-4">Shortened session — great job finishing!</p>
          )}
          <button onClick={handleCancel}
            className="w-full max-w-xs py-4 rounded-xl font-bold bg-cyan-500 text-white active:scale-95 transition-transform shadow-lg shadow-cyan-500/10">
            {t('common.done')}
          </button>
        </div>
      )}

      {showVideo && <VideoModal exercise={exercise} onClose={() => setShowVideo(false)} />}

      {achievement && (
        <AchievementPopup
          achievement={achievement}
          onDismiss={() => setAchievement(null)}
        />
      )}

      {showRestModal && (
        <RestSettingsModal
          currentExId={currentExId}
          currentSeconds={restSeconds}
          onSave={handleSaveRestTime}
          onClose={() => setShowRestModal(false)}
        />
      )}

      {showSwapModal && (
        <SwapExerciseModal
          alternatives={alternatives}
          onSwap={handleSwapExercise}
          onClose={() => setShowSwapModal(false)}
        />
      )}
    </div>
  );
}
