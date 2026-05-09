import { useState } from 'react';
import { useData } from '../hooks/useData';
import { getBodyPart, BODY_PARTS, EXERCISE_DEFAULTS } from '../data/exercises';

export default function LogPage() {
  const { exercises, addLog, addExercise } = useData();
  const [search, setSearch] = useState('');
  const [selectedEx, setSelectedEx] = useState(null);
  const [sets, setSets] = useState([{ reps: '', weight: '' }]);
  const [note, setNote] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExName, setNewExName] = useState('');

  const filtered = exercises.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.bodyPart.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = () => {
    if (!selectedEx) return;
    addLog({
      exerciseId: selectedEx.id,
      sets: sets.filter(s => s.reps !== '').map(s => ({
        reps: parseInt(s.reps) || 0,
        weight: parseFloat(s.weight) || 0,
      })),
      note,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
    });
    setSelectedEx(null);
    setSets([{ reps: '', weight: '' }]);
    setNote('');
  };

  const addSet = () => setSets([...sets, { reps: '', weight: '' }]);
  const updateSet = (i, field, val) => {
    const newSets = [...sets];
    newSets[i][field] = val;
    setSets(newSets);
  };

  const handleAddExercise = () => {
    if (!newExName.trim()) return;
    addExercise({ name: newExName.trim(), bodyPart: 'Other' });
    setNewExName('');
    setShowAddForm(false);
  };

  if (selectedEx) {
    return (
      <div className="p-4 space-y-4">
        <button onClick={() => setSelectedEx(null)} className="text-blue-400">&larr; Back</button>
        <h2 className="text-xl font-bold">{selectedEx.name}</h2>
        <p className="text-sm text-gray-400">{getBodyPart(selectedEx.name)}</p>

        <div className="space-y-2">
          {sets.map((s, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-gray-400 w-6">{i + 1}.</span>
              <input
                type="number"
                placeholder="Reps"
                className="bg-gray-800 rounded px-3 py-2 w-24"
                value={s.reps}
                onChange={e => updateSet(i, 'reps', e.target.value)}
              />
              <input
                type="number"
                step="0.5"
                placeholder="Weight"
                className="bg-gray-800 rounded px-3 py-2 w-24"
                value={s.weight}
                onChange={e => updateSet(i, 'weight', e.target.value)}
              />
              <span className="text-gray-400">lbs</span>
            </div>
          ))}
          <button onClick={addSet} className="text-blue-400 text-sm">+ Add set</button>
        </div>

        <input
          type="text"
          placeholder="Note (optional)"
          className="w-full bg-gray-800 rounded px-3 py-2"
          value={note}
          onChange={e => setNote(e.target.value)}
        />

        <button
          onClick={handleSubmit}
          className="w-full bg-green-600 text-white rounded-lg py-3 font-semibold"
        >
          Save Workout
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Log Exercise</h1>

      <input
        type="text"
        placeholder="Search exercises..."
        className="w-full bg-gray-800 rounded px-3 py-2"
        value={search}
        onChange={e => setSearch(e.target.value)}
        autoFocus
      />

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setSearch('')} className="text-sm text-blue-400">All</button>
        {BODY_PARTS.map(bp => (
          <button key={bp} onClick={() => setSearch(bp)} className="text-sm bg-gray-800 px-2 py-1 rounded">
            {bp}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        {filtered.map(ex => (
          <button
            key={ex.id}
            onClick={() => setSelectedEx(ex)}
            className="w-full text-left bg-gray-800 rounded-lg p-3 hover:bg-gray-700"
          >
            <span className="font-medium">{ex.name}</span>
            <span className="text-gray-400 text-sm ml-2">{ex.bodyPart}</span>
          </button>
        ))}
      </div>

      <button onClick={() => setShowAddForm(!showAddForm)} className="text-blue-400 text-sm">
        + Add custom exercise
      </button>

      {showAddForm && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Exercise name"
            className="flex-1 bg-gray-800 rounded px-3 py-2"
            value={newExName}
            onChange={e => setNewExName(e.target.value)}
          />
          <button onClick={handleAddExercise} className="bg-blue-600 px-4 rounded-lg">Add</button>
        </div>
      )}
    </div>
  );
}
