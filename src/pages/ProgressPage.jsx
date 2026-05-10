import { useState, useMemo } from 'react';
import { TrendingUp, Dumbbell, Calendar, Flame } from 'lucide-react';
import { useData } from '../hooks/useData';
import { COLOR_MAP } from '../data/exercises';

export default function ProgressPage() {
  const { exercises, logs, goals, getLogsForExercise, getBestSet } = useData();
  const [selectedEx, setSelectedEx] = useState(null);

  const exerciseHistory = useMemo(() => {
    if (!selectedEx) return [];
    return getLogsForExercise(selectedEx);
  }, [selectedEx, logs]);

  const stats = useMemo(() => {
    if (!selectedEx) return { total: 0, best: 0, avg: 0, days: 0 };
    const exLogs = logs.filter(l => l.exerciseId === selectedEx);
    const best = Math.max(...exLogs.map(l => l.reps || 0), 0);
    const total = exLogs.length;
    const days = new Set(exLogs.map(l => l.date.split('T')[0])).size;
    const sum = exLogs.reduce((acc, l) => acc + (l.reps || 0), 0);
    return { total, best, avg: total > 0 ? Math.round(sum / total) : 0, days };
  }, [selectedEx, logs]);

  if (selectedEx) {
    const ex = exercises.find(e => e.id === selectedEx);
    const colors = COLOR_MAP[ex?.color] || COLOR_MAP.cyan;

    return (
      <div className="p-4 pb-32 max-w-lg mx-auto">
        <button onClick={() => setSelectedEx(null)}
          className="text-sm text-cyan-400 mb-4 hover:text-cyan-300 transition-colors">
          ← Back to all exercises
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center`}>
            <Dumbbell className={colors.text} size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{ex?.name}</h2>
            <p className="text-sm text-slate-400">{ex?.bodyPart}</p>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <div className="glass-card rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-white">{stats.total}</p>
            <p className="text-xs text-slate-500">Sets</p>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <p className={`text-2xl font-black ${colors.text}`}>{stats.best}</p>
            <p className="text-xs text-slate-500">Best</p>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-white">{stats.avg}</p>
            <p className="text-xs text-slate-500">Avg</p>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-white">{stats.days}</p>
            <p className="text-xs text-slate-500">Days</p>
          </div>
        </div>

        {/* History */}
        <h3 className="text-sm font-semibold text-slate-400 mb-3">Recent Sets</h3>
        <div className="space-y-2">
          {[...exerciseHistory].reverse().slice(0, 30).map(entry => (
            <div key={entry.id} className="glass-card rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">{entry.reps} reps</p>
                {entry.weight > 0 && <p className="text-xs text-slate-500">{entry.weight} lbs</p>}
              </div>
              <p className="text-xs text-slate-500">
                {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </p>
            </div>
          ))}
          {exerciseHistory.length === 0 && (
            <p className="text-slate-500 text-center py-8">No logs for this exercise yet</p>
          )}
        </div>
      </div>
    );
  }

  // Summary view
  return (
    <div className="p-4 pb-32 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp size={18} className="text-cyan-400" />
        <h1 className="text-xl font-bold text-white">Progress</h1>
      </div>
      <p className="text-sm text-slate-400 mb-4">Your training at a glance</p>

      <div className="space-y-3">
        {exercises.map(ex => {
          const colors = COLOR_MAP[ex.color] || COLOR_MAP.cyan;
          const best = getBestSet(ex.id);
          const progress = best > 0 ? Math.min(100, Math.round((best / (ex.startReps * 2)) * 100)) : 0;

          return (
            <button key={ex.id} onClick={() => setSelectedEx(ex.id)}
              className="w-full glass-card rounded-xl p-4 text-left active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                  <Dumbbell className={colors.text} size={18} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white text-sm">{ex.name}</p>
                  <p className="text-xs text-slate-500">Best: {best} reps</p>
                </div>
                <div className="w-10 h-10 relative">
                  <svg width={40} height={40} className="transform -rotate-90">
                    <circle cx={20} cy={20} r={16} fill="none" stroke="rgba(30,41,59,0.3)" strokeWidth={4} />
                    <circle cx={20} cy={20} r={16} fill="none" stroke={colors.hex} strokeWidth={4}
                      strokeDasharray={100} strokeDashoffset={100 - (progress / 100) * 100}
                      strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                    {progress}%
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {exercises.length === 0 && (
        <div className="glass-card rounded-xl p-8 text-center mt-8">
          <p className="text-slate-400">Add exercises to see progress</p>
        </div>
      )}
    </div>
  );
}
