import { useState } from 'react';
import { useData } from '../hooks/useData';

export default function GoalsPage() {
  const { exercises, goals, addGoal, removeGoal } = useData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ exerciseId: '', targetReps: '', targetWeight: '', weeklyFreq: '2' });

  const handleSubmit = () => {
    if (!form.exerciseId) return;
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 42); // 6 weeks
    addGoal({
      exerciseId: form.exerciseId,
      targetReps: parseInt(form.targetReps) || 0,
      targetWeight: parseFloat(form.targetWeight) || 0,
      weeklyFreq: parseInt(form.weeklyFreq) || 2,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    });
    setShowForm(false);
    setForm({ exerciseId: '', targetReps: '', targetWeight: '', weeklyFreq: '2' });
  };

  const getGoalProgress = (goal) => {
    const logs = goal.logs || [];
    const best = logs.length > 0
      ? Math.max(...logs.flatMap(l => l.sets?.map(s => s.reps || 0) || [0]))
      : 0;
    const target = goal.targetReps || 1;
    return Math.min(100, Math.round((best / target) * 100));
  };

  const daysRemaining = (goal) => {
    const end = new Date(goal.endDate);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">6-Week Goals</h1>

      {goals.length === 0 && !showForm && (
        <p className="text-gray-400">No goals yet. Set your first 6-week goal!</p>
      )}

      <div className="space-y-3">
        {goals.map(g => {
          const ex = exercises.find(e => e.id === g.exerciseId);
          const remaining = daysRemaining(g);
          const progress = getGoalProgress(g);
          const week = Math.floor((42 - remaining) / 7) + 1;
          const totalWeeks = 6;

          return (
            <div key={g.id} className="bg-gray-800 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{ex?.name || 'Unknown'}</h3>
                  <p className="text-sm text-gray-400">
                    Week {week} of {totalWeeks} &middot; {remaining} days left
                  </p>
                </div>
                <button onClick={() => removeGoal(g.id)} className="text-red-400 text-sm">Remove</button>
              </div>

              {g.targetReps > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Reps: {g.targetReps}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {g.targetWeight > 0 && (
                <div className="text-sm text-gray-400">
                  Weight goal: {g.targetWeight} lbs
                </div>
              )}

              {g.weeklyFreq > 0 && (
                <div className="text-sm text-gray-400">
                  Target: {g.weeklyFreq}x per week
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold"
        >
          + New Goal
        </button>
      ) : (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold">New 6-Week Goal</h3>

          <select
            className="w-full bg-gray-700 rounded px-3 py-2"
            value={form.exerciseId}
            onChange={e => setForm({ ...form, exerciseId: e.target.value })}
          >
            <option value="">Select exercise...</option>
            {exercises.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Target reps (e.g., 50 push-ups)"
            className="w-full bg-gray-700 rounded px-3 py-2"
            value={form.targetReps}
            onChange={e => setForm({ ...form, targetReps: e.target.value })}
          />

          <input
            type="number"
            step="5"
            placeholder="Target weight (e.g., 225 lbs)"
            className="w-full bg-gray-700 rounded px-3 py-2"
            value={form.targetWeight}
            onChange={e => setForm({ ...form, targetWeight: e.target.value })}
          />

          <input
            type="number"
            placeholder="Times per week (default: 2)"
            className="w-full bg-gray-700 rounded px-3 py-2"
            value={form.weeklyFreq}
            onChange={e => setForm({ ...form, weeklyFreq: e.target.value })}
          />

          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-700 rounded py-2">
              Cancel
            </button>
            <button onClick={handleSubmit} className="flex-1 bg-green-600 rounded py-2 font-semibold">
              Save Goal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
