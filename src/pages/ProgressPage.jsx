import { useState } from 'react';
import { useData } from '../hooks/useData';

export default function ProgressPage() {
  const { exercises, logs, goals } = useData();
  const [selectedEx, setSelectedEx] = useState(null);

  // Group logs by exercise
  const exerciseHistory = {};
  logs.forEach(l => {
    if (!exerciseHistory[l.exerciseId]) exerciseHistory[l.exerciseId] = [];
    exerciseHistory[l.exerciseId].push(l);
  });

  // Sort each exercise's logs by date
  Object.values(exerciseHistory).forEach(h => h.sort((a, b) => a.date.localeCompare(b.date)));

  if (selectedEx) {
    const history = exerciseHistory[selectedEx.id] || [];
    const exGoals = goals.filter(g => g.exerciseId === selectedEx.id);
    const bestReps = history.length > 0
      ? Math.max(...history.flatMap(l => l.sets?.map(s => s.reps || 0) || [0]))
      : 0;

    return (
      <div className="p-4 space-y-4">
        <button onClick={() => setSelectedEx(null)} className="text-blue-400">&larr; Back</button>
        <h2 className="text-xl font-bold">{selectedEx.name}</h2>
        <p className="text-sm text-gray-400">{selectedEx.bodyPart}</p>

        {exGoals.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-3">
            <h3 className="font-semibold mb-1">Goals</h3>
            {exGoals.map(g => (
              <div key={g.id} className="text-sm text-gray-300">
                Target: {g.targetReps || '-'} reps / {g.targetWeight || '-'} lbs
                &middot; {g.weeklyFreq}x/week
              </div>
            ))}
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-sm text-gray-400">Best reps: <span className="text-green-400 font-bold">{bestReps}</span></div>
        </div>

        <h3 className="font-semibold">History</h3>
        {history.length === 0 ? (
          <p className="text-gray-400">No logs yet</p>
        ) : (
          <div className="space-y-2">
            {history.slice().reverse().map((l, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{l.date}</span>
                  {l.note && <span className="text-gray-500 italic">{l.note}</span>}
                </div>
                <div className="mt-1 space-y-0.5">
                  {l.sets?.map((s, j) => (
                    <div key={j} className="text-sm">
                      Set {j + 1}: {s.reps || 0} reps{s.weight ? ` @ ${s.weight} lbs` : ''}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Show all exercises with their stats
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Progress</h1>

      <div className="space-y-2">
        {exercises.map(ex => {
          const h = exerciseHistory[ex.id] || [];
          const totalSets = h.reduce((sum, l) => sum + (l.sets?.length || 0), 0);
          const lastDate = h.length > 0 ? h[h.length - 1].date : null;

          return (
            <button
              key={ex.id}
              onClick={() => setSelectedEx(ex)}
              className="w-full text-left bg-gray-800 rounded-lg p-3 hover:bg-gray-700"
            >
              <div className="flex justify-between">
                <div>
                  <span className="font-medium">{ex.name}</span>
                  <span className="text-gray-400 text-sm ml-2">{ex.bodyPart}</span>
                </div>
                <span className="text-sm text-gray-400">{totalSets} sets</span>
              </div>
              {lastDate && <div className="text-xs text-gray-500 mt-1">Last: {lastDate}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
