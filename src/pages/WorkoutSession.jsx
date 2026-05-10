import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, Square, Check, ChevronRight, X, Dumbbell, Youtube, Plus, Minus } from 'lucide-react';
import { useData } from '../hooks/useData';
import { COLOR_MAP, getExercise } from '../data/exercises';

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

  return { timeLeft, running, start, pause, reset, setTimeLeft };
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
function RestScreen({ seconds, running, onFinish, onStart, onPause, nextExercise, colors, currentSet, totalSets }) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8">
      <p className="text-sm text-slate-400 mb-6">REST — Set {currentSet} of {totalSets}</p>
      <div className="relative mb-8">
        <div className="w-40 h-40 rounded-full border-4 border-slate-800 flex items-center justify-center">
          <span className="text-5xl font-black text-white">{mins}:{secs.toString().padStart(2, '0')}</span>
        </div>
      </div>
      <div className="flex gap-3 mb-8">
        {running ? (
          <button onClick={onPause} className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center active:scale-90 transition-transform">
            <Pause size={24} className="text-white" />
          </button>
        ) : (
          <button onClick={onStart} className="w-14 h-14 rounded-full bg-cyan-500 flex items-center justify-center active:scale-90 transition-transform">
            <Play size={24} className="text-white fill-current ml-1" />
          </button>
        )}
        <button onClick={onFinish} className={`px-8 py-3 rounded-xl font-bold ${colors.solid} text-white active:scale-95 transition-transform`}>
          Skip
        </button>
      </div>
      {nextExercise && (
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-1">Next: {nextExercise.name}</p>
          <div className={`w-10 h-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center mx-auto`}>
            <Dumbbell size={18} className={colors.text} />
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────── Workout Session ────────────
export default function WorkoutSession({ exerciseId, onComplete, onCancel }) {
  const { logSet, getBestSet } = useData();
  const exercise = getExercise(exerciseId);
  const colors = COLOR_MAP[exercise?.color] || COLOR_MAP.cyan;

  const [phase, setPhase] = useState('active'); // active | rest | done
  const [currentSet, setCurrentSet] = useState(1);
  const [setsCompleted, setSetsCompleted] = useState([]);
  const [currentReps, setCurrentReps] = useState(exercise?.startReps || 10);
  const [currentWeight, setCurrentWeight] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [bestReps, setBestReps] = useState(0);

  const targetSets = 3;
  const restSeconds = 90;
  const timer = useTimer(restSeconds);

  useEffect(() => { setBestReps(getBestSet(exerciseId)); }, [exerciseId, logs]);

  // Wake lock
  useEffect(() => {
    let wakeLock = null;
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(wl => wakeLock = wl).catch(() => {});
    }
    return () => wakeLock?.release();
  }, []);

  // Quick add reps
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
    logSet(exerciseId, currentReps, currentWeight);

    navigator.vibrate?.(100);

    if (currentSet >= targetSets) {
      setPhase('done');
    } else {
      setCurrentSet(prev => prev + 1);
      setPhase('rest');
      timer.reset(restSeconds);
      timer.start();
    }
  }, [currentSet, currentReps, currentWeight, exerciseId]);

  // Finish rest → back to active
  const handleFinishRest = useCallback(() => {
    timer.pause();
    setPhase('active');
  }, []);

  // Cancel
  const handleCancel = useCallback(() => {
    if (setsCompleted.length > 0) {
      // Save progress
      const result = { exerciseId, sets: setsCompleted };
      onComplete?.(result);
    }
    onCancel?.();
  }, [setsCompleted, exerciseId]);

  if (!exercise) return <div className="fixed inset-0 bg-slate-950 z-50 flex items-center justify-center text-slate-400">Exercise not found</div>;

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <button onClick={handleCancel} className="text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
        <div className="text-center">
          <p className="text-xs text-slate-500">{exercise.bodyPart}</p>
          <h2 className="font-bold text-white">{exercise.name}</h2>
        </div>
        <button onClick={() => setShowVideo(true)} className="text-slate-400 hover:text-red-400 transition-colors">
          <Youtube size={20} />
        </button>
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
                <p className="text-sm text-slate-400">reps</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-500 mb-6">Set {currentSet} of {targetSets}</p>

          {/* Rep counter */}
          <div className="flex items-center gap-6 mb-8">
            <button onClick={() => adjustReps(-5)}
              className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center active:scale-90 transition-transform">
              <Minus size={24} className="text-slate-400" />
            </button>
            <button onClick={() => adjustReps(5)}
              className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center active:scale-90 transition-transform">
              <Plus size={24} className="text-slate-400" />
            </button>
          </div>

          {/* Weight input (gym exercises) */}
          {!exercise.home && (
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => adjustWeight(-5)} className="p-2 rounded-lg bg-slate-800 text-slate-400 active:scale-90">
                <Minus size={16} />
              </button>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{currentWeight}</p>
                <p className="text-xs text-slate-500">lbs</p>
              </div>
              <button onClick={() => adjustWeight(5)} className="p-2 rounded-lg bg-slate-800 text-slate-400 active:scale-90">
                <Plus size={16} />
              </button>
            </div>
          )}

          {/* Complete Set */}
          <button onClick={handleCompleteSet}
            className={`w-full max-w-xs py-4 rounded-xl font-bold text-lg text-white ${colors.solid}
              active:scale-95 transition-transform flex items-center justify-center gap-2`}>
            <Check size={20} /> Complete Set
          </button>

          {/* Best */}
          {bestReps > 0 && (
            <p className="text-xs text-slate-500 mt-4">Best: {bestReps} reps</p>
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
          nextExercise={null}
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
          <p className="text-slate-400 mb-6">Workout complete!</p>
          <div className="glass-card rounded-xl p-4 w-full max-w-xs mb-8">
            {setsCompleted.map((s, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-slate-800 last:border-0">
                <span className="text-slate-400">Set {i + 1}</span>
                <span className="text-white font-bold">{s.reps} reps</span>
              </div>
            ))}
          </div>
          <button onClick={handleCancel}
            className="w-full max-w-xs py-4 rounded-xl font-bold bg-cyan-500 text-white active:scale-95 transition-transform">
            Done
          </button>
        </div>
      )}

      {showVideo && <VideoModal exercise={exercise} onClose={() => setShowVideo(false)} />}
    </div>
  );
}
