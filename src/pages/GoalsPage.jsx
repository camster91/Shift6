import { useState, useMemo } from 'react';
import { Target, Dumbbell, Plus, Trash2 } from 'lucide-react';
import { useData } from '../hooks/useData';
import { COLOR_MAP } from '../data/exercises';

export default function GoalsPage() {
  const { exercises, goals, getBestSet, setGoal, removeGoal } = useData();
  const [editing, setEditing] = useState(null);
  const [targetReps, setTargetReps] = useState(20);

  const goalList = useMemo(() => {
    return exercises.map(ex => {
      const goal = goals.find(g => g.exerciseId === ex.id);
      const best = getBestSet(ex.id);
      const target = goal?.targetReps || ex.startReps * 2;
      const progress = target > 0 ? Math.min(100, Math.round((best / target) * 100)) : 0;
      return { ...ex, goal, best, target, progress };
    });
  }, [exercises, goals, getBestSet]);

  const handleSetGoal = (exerciseId) => {
    setGoal(exerciseId, targetReps, 6);
    setEditing(null);
  };

  return (
    <div className="p-4 pb-32 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Target size={18} className="text-cyan-400" />
        <h1 className="text-xl font-bold text-white">6-Week Goals</h1>
      </div>
      <p className="text-sm text-slate-400 mb-4">Set progress targets for each exercise</p>

      <div className="space-y-3">
        {goalList.map(ex => {
          const colors = COLOR_MAP[ex.color] || COLOR_MAP.cyan;
          const hasGoal = !!ex.goal;

          return (
            <div key={ex.id} className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                  <Dumbbell className={colors.text} size={18} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white text-sm">{ex.name}</p>
                  <p className="text-xs text-slate-500">Best: {ex.best} reps</p>
                </div>
                {hasGoal ? (
                  <button onClick={() => removeGoal(ex.id)}
                    className="text-red-400 hover:text-red-300 p-2">
                    <Trash2 size={16} />
                  </button>
                ) : (
                  <button onClick={() => { setEditing(ex.id); setTargetReps(ex.startReps * 2); }}
                    className="text-cyan-400 hover:text-cyan-300 p-2">
                    <Plus size={16} />
                  </button>
                )}
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 rounded-full h-2.5 mb-1">
                <div className={`h-full rounded-full ${colors.solid}`}
                  style={{ width: `${ex.progress}%`, transition: 'width 0.8s ease' }} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">{ex.best} reps</span>
                <span className="text-white font-medium">{ex.target} reps target</span>
              </div>

              {/* Inline goal editor */}
              {editing === ex.id && (
                <div className="mt-3 pt-3 border-t border-slate-800 animate-fade-in">
                  <p className="text-xs text-slate-500 mb-2">Target reps in 6 weeks:</p>
                  <div className="flex gap-2">
                    <input type="number" value={targetReps}
                      onChange={e => setTargetReps(parseInt(e.target.value) || 0)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
                    <button onClick={() => handleSetGoal(ex.id)}
                      className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-bold active:scale-95">
                      Set
                    </button>
                    <button onClick={() => setEditing(null)}
                      className="px-3 py-2 text-slate-400 text-sm">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
