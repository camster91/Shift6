import { useState } from 'react';
import { Plus, Dumbbell, Minus, Check, Flame, ChevronRight } from 'lucide-react';
import { useData } from '../hooks/useData';
import { COLOR_MAP, getExercise } from '../data/exercises';

const BODY_PART_ICONS = {
  Chest: '💪', Back: '🔙', Shoulders: '🎯', Legs: '🦵',
  Arms: '💪', Core: '🔥', Glutes: '🍑',
};

export default function LogPage({ onStartWorkout }) {
  const { exercises, logSet, getTodayLogs, getBestSet, getCurrentStreak } = useData();
  const [selectedEx, setSelectedEx] = useState(null);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(0);
  const todayLogs = getTodayLogs();
  const streak = getCurrentStreak();

  // Group today's logs by exercise
  const todayByExercise = {};
  todayLogs.forEach(log => {
    if (!todayByExercise[log.exerciseId]) todayByExercise[log.exerciseId] = [];
    todayByExercise[log.exerciseId].push(log);
  });

  const handleQuickLog = (exerciseId) => {
    if (selectedEx === exerciseId) {
      logSet(exerciseId, reps, weight);
      navigator.vibrate?.(50);
    } else {
      const ex = exercises.find(e => e.id === exerciseId);
      setSelectedEx(exerciseId);
      setReps(ex?.startReps || 10);
      setWeight(0);
    }
  };

  const streakMsg = streak > 0
    ? `${streak} day streak${streak >= 7 ? ' 🔥' : ''}`
    : 'Start your streak today!';

  return (
    <div className="p-4 pb-32 max-w-lg mx-auto space-y-4">

      {/* Header stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Quick Log</h1>
          <p className="text-sm text-slate-400">
            {todayLogs.length > 0
              ? `${todayLogs.length} set${todayLogs.length !== 1 ? 's' : ''} logged today`
              : 'Nothing logged yet'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded-full border border-orange-500/20">
          <Flame size={14} className="fill-orange-400" />
          <span className="text-xs font-bold">{streakMsg}</span>
        </div>
      </div>

      {/* Today's workout summary */}
      {todayLogs.length > 0 && (
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">
            Today&apos;s Workout
          </p>
          <div className="space-y-2">
            {Object.entries(todayByExercise).map(([exId, logs]) => {
              const ex = exercises.find(e => e.id === exId);
              if (!ex) return null;
              const colors = COLOR_MAP[ex.color] || COLOR_MAP.cyan;
              const icon = BODY_PART_ICONS[ex.bodyPart] || '💪';
              return (
                <div key={exId} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center text-sm`}>
                    {icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{ex.name}</p>
                    <p className="text-xs text-slate-500">
                      {logs.map(l => `${l.reps}${l.weight ? ` × ${l.weight}lbs` : ''}`).join(', ')}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} font-medium`}>
                    {logs.length} set{logs.length !== 1 ? 's' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Exercise quick-log cards */}
      <div className="space-y-2">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
          {todayLogs.length > 0 ? 'Add More Sets' : 'Start Training'}
        </p>
        {exercises.map(ex => {
          const colors = COLOR_MAP[ex.color] || COLOR_MAP.cyan;
          const isSelected = selectedEx === ex.id;
          const todayCount = (todayByExercise[ex.id] || []).length;
          const best = getBestSet(ex.id);
          const icon = BODY_PART_ICONS[ex.bodyPart] || '💪';

          return (
            <div key={ex.id} className={`glass-card rounded-2xl overflow-hidden transition-all ${
              isSelected ? `border ${colors.border}` : ''
            }`}>
              <button
                onClick={() => handleQuickLog(ex.id)}
                className="w-full text-left p-3.5 flex items-center gap-3"
              >
                <div className={`w-10 h-10 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center text-base flex-shrink-0`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm">{ex.name}</p>
                  <p className="text-xs text-slate-500">
                    {todayCount > 0
                      ? `${todayCount} today · Best: ${best} reps`
                      : best > 0 ? `Best: ${best} reps` : 'No data yet'}
                  </p>
                </div>
                {todayCount > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} font-medium flex-shrink-0`}>
                    {todayCount}
                  </span>
                )}
              </button>

              {/* Expanded log input */}
              {isSelected && (
                <div className="px-3 pb-3.5 pt-0 border-t border-slate-800/50 mt-0 animate-slide-up">
                  <div className="flex items-center gap-3 mt-3">
                    {/* Reps */}
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 mb-1.5 text-center">Reps</p>
                      <div className="flex items-center gap-1.5 bg-slate-800/60 rounded-xl p-1.5">
                        <button
                          onClick={() => setReps(Math.max(0, reps - 5))}
                          className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-xl font-black text-white w-10 text-center">{reps}</span>
                        <button
                          onClick={() => setReps(reps + 5)}
                          className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Weight — only for gym exercises */}
                    {!ex.home && (
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 mb-1.5 text-center">lbs</p>
                        <div className="flex items-center gap-1.5 bg-slate-800/60 rounded-xl p-1.5">
                          <button
                            onClick={() => setWeight(Math.max(0, weight - 5))}
                            className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-xl font-black text-white w-10 text-center">{weight}</span>
                          <button
                            onClick={() => setWeight(weight + 5)}
                            className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Log button */}
                    <button
                      onClick={() => { logSet(ex.id, reps, weight); setSelectedEx(null); }}
                      className={`self-end px-4 py-2.5 rounded-xl ${colors.solid} text-white text-sm font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-lg`}
                    >
                      <Check size={16} /> Log
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {exercises.length === 0 && (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Dumbbell size={36} className="mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400">Finish onboarding to add exercises</p>
          </div>
        )}
      </div>
    </div>
  );
}