import { useState } from 'react';
import { Plus, Dumbbell, Minus, Check } from 'lucide-react';
import { useData } from '../hooks/useData';
import { COLOR_MAP, getExercise } from '../data/exercises';

export default function LogPage() {
  const { exercises, logSet, getTodayLogs, getBestSet } = useData();
  const [selectedEx, setSelectedEx] = useState(null);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(0);
  const todayLogs = getTodayLogs();

  // Quick log a set
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

  return (
    <div className="p-4 pb-32 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white mb-1">Quick Log</h1>
      <p className="text-sm text-slate-400 mb-4">Logged {todayLogs.length} sets today</p>

      <div className="space-y-3">
        {/* Exercise selector */}
        {exercises.map(ex => {
          const colors = COLOR_MAP[ex.color] || COLOR_MAP.cyan;
          const isSelected = selectedEx === ex.id;
          const todayCount = todayLogs.filter(l => l.exerciseId === ex.id).length;
          const best = getBestSet(ex.id);

          return (
            <div key={ex.id} className={`glass-card rounded-xl overflow-hidden transition-all`}>
              <button onClick={() => handleQuickLog(ex.id)}
                className="w-full text-left p-3 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                  <Dumbbell className={colors.text} size={18} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white text-sm">{ex.name}</p>
                  <p className="text-xs text-slate-500">{todayCount} today · Best: {best}</p>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full ${colors.bg} ${colors.text}`}>
                  {todayCount}
                </div>
              </button>

              {/* Quick log input */}
              {isSelected && (
                <div className="px-3 pb-3 border-t border-slate-800 pt-3 animate-fade-in">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 mb-1">Reps</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setReps(Math.max(0, reps - 5))}
                          className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                          <Minus size={14} />
                        </button>
                        <span className="text-xl font-bold text-white w-12 text-center">{reps}</span>
                        <button onClick={() => setReps(reps + 5)}
                          className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                    {!ex.home && (
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 mb-1">Weight (lbs)</p>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setWeight(Math.max(0, weight - 5))}
                            className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                            <Minus size={14} />
                          </button>
                          <span className="text-xl font-bold text-white w-12 text-center">{weight}</span>
                          <button onClick={() => setWeight(weight + 5)}
                            className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                    <button onClick={() => { logSet(ex.id, reps, weight); setSelectedEx(null); }}
                      className={`self-end px-4 py-2 rounded-lg ${colors.solid} text-white text-sm font-bold`}>
                      <Check size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {exercises.length === 0 && (
          <div className="glass-card rounded-xl p-8 text-center">
            <p className="text-slate-400">Add some exercises first</p>
          </div>
        )}
      </div>
    </div>
  );
}
