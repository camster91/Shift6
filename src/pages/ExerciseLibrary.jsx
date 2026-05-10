import { useState, useMemo } from 'react';
import { Plus, Check, Search, Dumbbell, X } from 'lucide-react';
import { useData } from '../hooks/useData';
import { EXERCISES, COLOR_MAP, BODY_PARTS, EQUIPMENT_TYPES } from '../data/exercises';

export default function ExerciseLibrary({ onBack }) {
  const { myExercises, addExercise, removeExercise } = useData();
  const [search, setSearch] = useState('');
  const [filterBodyPart, setFilterBodyPart] = useState('all');

  const filtered = useMemo(() => {
    return EXERCISES.filter(ex => {
      if (filterBodyPart !== 'all' && ex.bodyPart !== filterBodyPart) return false;
      if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, filterBodyPart]);

  // Group by body part
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(ex => {
      if (!groups[ex.bodyPart]) groups[ex.bodyPart] = [];
      groups[ex.bodyPart].push(ex);
    });
    return groups;
  }, [filtered]);

  return (
    <div className="p-4 pb-32 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Exercise Library</h1>
        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors p-2">
          <X size={20} />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search exercises..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500" />
      </div>

      {/* Body part filter */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
        <button onClick={() => setFilterBodyPart('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            filterBodyPart === 'all' ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
          All
        </button>
        {BODY_PARTS.map(bp => (
          <button key={bp} onClick={() => setFilterBodyPart(bp)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filterBodyPart === bp ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
            {bp}
          </button>
        ))}
      </div>

      {/* Exercise list */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([bodyPart, exercises]) => (
          <div key={bodyPart}>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{bodyPart}</h3>
            <div className="space-y-2">
              {exercises.map(ex => {
                const isInCollection = myExercises.includes(ex.id);
                const colors = COLOR_MAP[ex.color] || COLOR_MAP.cyan;
                return (
                  <div key={ex.id}
                    className={`glass-card rounded-xl p-3 flex items-center gap-3 ${isInCollection ? 'opacity-60' : ''}`}>
                    <div className={`w-10 h-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>
                      <Dumbbell className={colors.text} size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{ex.name}</p>
                      <p className="text-xs text-slate-500">{ex.equipment === 'none' ? 'No equipment' : ex.equipment}</p>
                    </div>
                    <button onClick={() => isInCollection ? removeExercise(ex.id) : addExercise(ex.id)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        isInCollection ? 'bg-slate-800 text-slate-500' : `${colors.solid} text-white`
                      }`}>
                      {isInCollection ? <Check size={16} /> : <Plus size={16} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
