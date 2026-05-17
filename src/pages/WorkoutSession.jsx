import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Check, X, Dumbbell, Youtube, Plus, Minus, Settings } from 'lucide-react';
import { useData } from '../hooks/useData';
import { COLOR_MAP, getExercise } from '../data/exercises';
import { t } from '../i18n';

// ──────────── Rest Settings Modal ────────────
function RestSettingsModal({ currentSeconds, onSave, onClose }) {
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
        <button onClick={() => { updateSettings({ restTimes: { ...(settings?.restTimes || {}), ['']: undefined } }); onClose(); }}
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
          navigator.vibrate?.(200);
          return 0;
        }
        return prev - 1;
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
    setTimeLeft(prev => prev + secs);
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

// ──────────── Rest Screen ────────────
function RestScreen({ seconds, running, onFinish, onStart, onPause, onAddTime, nextExercise, colors, currentSet, totalSets }) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8">
      <p className="text-sm text-slate-400 mb-2">{t('workout.rest')} — {t('workout.set')} {currentSet} {t('workout.setOf')} {totalSets}</p>
      <div className="relative mb-8">
        <div className={`w-44 h-44 rounded-full border-4 flex items-center justify-center transition-colors ${seconds <= 10 ? 'border-orange-500/50' : 'border-slate-800'}`}>
          <span className={`text-5xl font-black ${seconds <= 10 ? 'text-orange-400' : 'text-white'}`}>{mins}:{secs.toString().padStart(2, '0')}</span>
        </div>
        {seconds <= 10 && (
          <p className="text-center text-orange-400 text-xs mt-2 animate-pulse">Almost done!</p>
        )}
      </div>
      <div className="flex gap-3 mb-6">
        {running ? (
          <button onClick={onPause} className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center active:scale-90 transition-transform">
            <Pause size={24} className="text-white" />
          </button>
        ) : (
          <button onClick={onStart} className="w-14 h-14 rounded-full bg-cyan-500 flex items-center justify-center active:scale-90 transition-transform">
            <Play size={24} className="text-white fill-current ml-1" />
          </button>
        )}
        <button onClick={onAddTime} className="px-4 py-3 rounded-xl bg-slate-800 text-slate-400 font-bold text-sm active:scale-90">
          +30s
        </button>
        <button onClick={onFinish} className={`px-6 py-3 rounded-xl font-bold ${colors.solid} text-white active:scale-95 transition-transform`}>
          {t('workout.skip')}
        </button>
      </div>
      {nextExercise && (
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-1">{t('common.next')}: {nextExercise.name}</p>
          <div className={`w-10 h-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center mx-auto`}>
            <Dumbbell size={18} className={colors.text} />
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────── Workout Session ────────────
export default function WorkoutSession({ exerciseId, onComplete, onCancel, workoutQueue = [], workoutIndex = 0 }) {
  const { logSet, getBestSet, getCurrentStreak, logs, settings, getLastRepsFor, updateSettings } = useData();
  const exercise = getExercise(exerciseId);
  const colors = COLOR_MAP[exercise?.color] || COLOR_MAP.cyan;

  const [phase, setPhase] = useState('active'); // active | rest | done | choosing
  const [currentSet, setCurrentSet] = useState(1);
  const [setsCompleted, setSetsCompleted] = useState([]);
  const [currentReps, setCurrentReps] = useState(exercise?.startReps || 10);
  const [currentWeight, setCurrentWeight] = useState(0);

  // Reset state when exercise changes (queue advance)
  useEffect(() => {
    setPhase('active');
    setCurrentSet(1);
    setSetsCompleted([]);
    setCurrentWeight(0);
    const calibrated = settings?.calibratedStartReps?.[exerciseId];
    const last = getLastRepsFor(exerciseId);
    setCurrentReps(calibrated ?? (last > 0 ? last : (exercise?.startReps || 10)));
    setShowRestModal(false);
    setAchievement(null);
    // Keep bestReps fresh
    const best = getBestSet(exerciseId);
    setBestReps(best);
  }, [exerciseId, exercise, settings, getBestSet, getLastRepsFor]);
  const [showVideo, setShowVideo] = useState(false);
  const [showRestModal, setShowRestModal] = useState(false);
  const [bestReps, setBestReps] = useState(0);
  const [achievement, setAchievement] = useState(null);

  const targetSets = settings?.targetSets ?? 3;
  const restSeconds = settings?.restTimes?.[exerciseId] ?? settings?.restSeconds ?? 90;
  const timer = useTimer(restSeconds);

  // Determine next exercise in queue for rest screen preview
  const nextExerciseInQueue = workoutQueue.length > 1 && workoutIndex < workoutQueue.length - 1
    ? getExercise(workoutQueue[workoutIndex + 1])
    : null;


  // Snapshot log count before this workout (for achievement detection)
  const prevLogCount = useRef(logs.length);

  useEffect(() => {
    const best = getBestSet(exerciseId);
    setBestReps(best);
    // Check first_workout achievement on mount
    if (logs.length === 0 && prevLogCount.current === 0) {
      // Will be detected on first set
    }
  }, [exerciseId, logs, getBestSet]);

  // Wake lock
  useEffect(() => {
    let wakeLock = null;
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(wl => wakeLock = wl).catch(() => {});
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
    const prevBest = getBestSet(exerciseId);
    const streak = getCurrentStreak();

    logSet(exerciseId, currentReps, currentWeight);

    navigator.vibrate?.(100);

    // Check achievements on first set completion
    if (setsCompleted.length === 0) {
      // First ever workout
      if (prevLogCount.current === 0) {
        setAchievement('first_workout');
      }
      // First PR
      else if (currentReps > prevBest && prevBest > 0) {
        setAchievement('first_pr');
      }
      // Streak achievements
      else if (streak >= 7) {
        setAchievement('seven_day_streak');
      } else if (streak >= 3) {
        setAchievement('three_day_streak');
      }
    } else if (newLogCount >= 10 && prevLogCount.current < 10) {
      // 10 total sets
      setAchievement('ten_sets');
    }

    // If past target sets, stay in active phase (user can keep going or finish)
    if (currentSet >= targetSets) {
      // Don't go to done automatically — let user decide to finish or add sets
      // Show "Add Set" and "Finish" options
      setPhase('done');
    } else {
      setCurrentSet(prev => prev + 1);
      setPhase('rest');
      timer.reset(restSeconds);
      timer.start();
    }
  }, [currentSet, currentReps, currentWeight, exerciseId, logs, setsCompleted, targetSets, restSeconds, getBestSet, getCurrentStreak, logSet, timer]);

  // Finish rest → back to active
  const handleFinishRest = useCallback(() => {
    timer.pause();
    setPhase('active');
  }, [timer]);

  // Add 30s to rest timer
  const handleAddTime = useCallback(() => {
    timer.addTime(30);
    if (!timer.running) timer.start();
    navigator.vibrate?.(20);
  }, [timer]);

  // Save custom rest time for this exercise
  const handleSaveRestTime = useCallback((seconds) => {
    updateSettings({
      restTimes: { ...(settings?.restTimes || {}), [exerciseId]: seconds }
    });
    timer.reset(seconds);
    setShowRestModal(false);
    navigator.vibrate?.(30);
  }, [settings, exerciseId, timer, updateSettings]);

  // Cancel / Done
  const handleCancel = useCallback(() => {
    if (setsCompleted.length > 0) {
      // Auto-calibrate baseline from this session
      const avgReps = Math.round(setsCompleted.reduce((sum, s) => sum + s.reps, 0) / setsCompleted.length);
      const lastBest = getBestSet(exerciseId);
      const demonstrated = Math.max(avgReps, lastBest, exercise?.startReps || 10);
      const newBaseline = Math.round(demonstrated * 0.65);
      const currentCalib = settings?.calibratedStartReps?.[exerciseId] ?? exercise?.startReps ?? 10;
      if (newBaseline !== currentCalib) {
        updateSettings({
          calibratedStartReps: { ...(settings?.calibratedStartReps || {}), [exerciseId]: newBaseline }
        });
      }
      onComplete?.({ exerciseId, sets: setsCompleted });
    } else {
      onCancel?.();
    }
  }, [setsCompleted, exerciseId, exercise, settings, getBestSet, updateSettings, onCancel, onComplete]);

  if (!exercise) return <div className="fixed inset-0 bg-slate-950 z-50 flex items-center justify-center text-slate-400">{t('workout.exerciseNotFound')}</div>;

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

          {/* Quick +5 button */}
          <button onClick={() => adjustReps(5)}
            className="text-xs text-slate-500 hover:text-cyan-400 transition-colors mb-6">
            +5 reps fast
          </button>

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
        </div>
      )}

      {phase === 'rest' && (
        <RestScreen
          seconds={timer.timeLeft}
          running={timer.running}
          onStart={timer.start}
          onPause={timer.pause}
          onFinish={handleFinishRest}
          onAddTime={handleAddTime}
          nextExercise={nextExerciseInQueue}
          colors={colors}
          currentSet={currentSet}
          totalSets={targetSets}
        />
      )}

      {phase === 'done' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
            <Check size={36} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">{exercise.name}</h2>
          <p className="text-slate-400 mb-2">{t('workout.workoutComplete')}</p>
          {(() => {
            const hitPR = bestReps > 0 && setsCompleted.length > 0 && Math.max(...setsCompleted.map(s => s.reps)) > bestReps;
            if (hitPR) return <p className="text-amber-400 text-sm font-bold mb-2">New PR! 🎉</p>;
            return null;
          })()}
          <div className="glass-card rounded-xl p-4 w-full max-w-xs mb-6">
            {setsCompleted.map((s, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-slate-800 last:border-0">
                <span className="text-slate-400">{t('workout.set')} {i + 1}</span>
                <span className="text-white font-bold">{s.reps} {t('common.reps')}{s.weight ? ` · ${s.weight} ${t('common.lbs')}` : ''}</span>
              </div>
            ))}
          </div>
          {setsCompleted.length < targetSets && (
            <p className="text-xs text-slate-500 mb-4 text-center">Shortened session — great job finishing!</p>
          )}
          <button onClick={handleCancel}
            className="w-full max-w-xs py-4 rounded-xl font-bold bg-cyan-500 text-white active:scale-95 transition-transform">
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
          currentSeconds={restSeconds}
          onSave={handleSaveRestTime}
          onClose={() => setShowRestModal(false)}
        />
      )}
    </div>
  );
}
