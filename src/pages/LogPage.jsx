import { useState, useMemo } from 'react';
import { Plus, Dumbbell, Minus, Check, Flame, Trash2, Clock, ChevronDown, Edit } from 'lucide-react';
import { useData } from '../hooks/useData';
import { COLOR_MAP } from '../data/exercises';
import { getLocalDateString } from '../utils/date.js';

const BODY_PART_ICONS = {
  Chest: '💪', Back: '🔙', Shoulders: '🎯', Legs: '🦵',
  Arms: '💪', Core: '🔥', Glutes: '🍑',
};

export default function LogPage() {
  const { exercises, logSet, getTodayLogs, getBestSet, getCurrentStreak, logs, removeLog, updateLogNotes } = useData();
  const [selectedEx, setSelectedEx] = useState(null);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(0);
  const [expandedId, setExpandedId] = useState(null); // 'today' | 'history' | logId
  const [editingNote, setEditingNote] = useState(null); // logId | null
  const [noteText, setNoteText] = useState('');
  const todayLogs = getTodayLogs();
  const streak = getCurrentStreak();

  const todayKey = getLocalDateString();

  const logsByDate = useMemo(() => {
    const groups = {};
    logs.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(log => {
      const dateKey = getLocalDateString(new Date(log.date));
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(log);
    });
    return groups;
  }, [logs]);

  const formatDate = (isoStr) => {
    const d = new Date(isoStr);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const dateStr = getLocalDateString(d);
    if (dateStr === getLocalDateString(today)) return 'Today';
    if (dateStr === getLocalDateString(yesterday)) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleExpand = (exerciseId) => {
    if (selectedEx === exerciseId) {
      setSelectedEx(null);
    } else {
      const ex = exercises.find(e => e.id === exerciseId);
      setSelectedEx(exerciseId);
      setReps(ex?.startReps || 10);
      setWeight(0);
    }
  };

  const handleLog = (exerciseId) => {
    logSet(exerciseId, reps, weight);
    navigator.vibrate?.(50);
    setSelectedEx(null);
  };

  const handleDeleteLog = (logId, e) => {
    e.stopPropagation();
    removeLog(logId);
    navigator.vibrate?.(30);
  };

  const handleNoteChange = (logId, notes) => {
    updateLogNotes(logId, notes);
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

      {/* Quick warm-up presets */}
      {exercises.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Quick Warm-up</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {exercises.slice(0, 4).map(ex => {
              const warmUpReps = Math.max(2, Math.round((ex.startReps || 10) * 0.4));
              const colors = COLOR_MAP[ex.color] || COLOR_MAP.cyan;
              return (
                <button
                  key={ex.id}
                  onClick={() => { logSet(ex.id, warmUpReps, 0); navigator.vibrate?.(20); }}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl ${colors.bg} border ${colors.border} active:scale-95 transition-transform`}
                >
                  <span className="text-xs">{BODY_PART_ICONS[ex.bodyPart] || '💪'}</span>
                  <span className={`text-xs font-bold ${colors.text}`}>{ex.name} × {warmUpReps}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

{/* Today's workout summary - collapsible */}
      {todayLogs.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <button
            onClick={() => setExpandedId(expandedId === 'today' ? null : 'today')}
            className="w-full text-left p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-slate-500" />
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Today&apos;s Workout
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{todayLogs.length} set{todayLogs.length !== 1 ? 's' : ''}</span>
              <ChevronDown size={14} className={`text-slate-500 transition-transform ${expandedId === 'today' ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {expandedId === 'today' && (
            <div className="px-4 pb-4 space-y-2 animate-slide-up">
              {todayLogs.map(log => {
                const ex = exercises.find(e => e.id === log.exerciseId) || {};
                const colors = COLOR_MAP[ex.color] || COLOR_MAP.cyan;
                return (
                  <div key={log.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/20">
                    <div className={`w-7 h-7 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center text-xs flex-shrink-0`}>
                      {BODY_PART_ICONS[ex.bodyPart] || '💪'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{ex.name || 'Unknown'}</p>
                      <p className="text-xs text-slate-500">{log.reps} reps{log.weight ? ` · ${log.weight} lbs` : ''}</p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteLog(log.id, e)}
                      className="w-9 h-9 rounded-lg hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-colors flex items-center justify-center"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* History section */}
      {Object.keys(logsByDate).filter(d => d !== todayKey).length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setExpandedId(expandedId === 'history' ? null : 'history')}
            className="w-full flex items-center justify-between px-1"
          >
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">History</p>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${expandedId === 'history' ? 'rotate-180' : ''}`} />
          </button>
          {expandedId === 'history' && Object.entries(logsByDate).map(([dateStr, dateLogs]) => {
            return (
              <div key={dateStr} className="glass-card rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50">
                  <p className="text-sm font-semibold text-slate-300">{formatDate(dateStr)}</p>
                  <span className="text-xs text-slate-600">{dateLogs.length} sets</span>
                </div>
                <div className="divide-y divide-slate-800/30">
                  {dateLogs.map(log => {
                    const logEx = exercises.find(e => e.id === log.exerciseId) || {};
                    const logColors = COLOR_MAP[logEx.color] || COLOR_MAP.cyan;
                    return (
                      <div key={log.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/20 group relative">
                        <div className={`w-7 h-7 rounded-lg ${logColors.bg} border ${logColors.border} flex items-center justify-center text-xs flex-shrink-0`}>
                          {BODY_PART_ICONS[logEx.bodyPart] || '💪'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{logEx.name || 'Unknown'}</p>
                          <p className="text-xs text-slate-500">{log.reps} reps{log.weight ? ` · ${log.weight} lbs` : ''}</p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteLog(log.id, e)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          onClick={() => { setEditingNote(log.id); setNoteText(log.notes || ''); }}
                          className="p-1.5 rounded-lg hover:bg-cyan-500/20 text-slate-600 hover:text-cyan-400 transition-colors"
                        >
                          <Edit size={14} />
                        </button>
                        {editingNote === log.id && (
                          <div className="absolute right-0 top-10 z-10 bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl w-64 animate-scale-in">
                            <p className="text-xs text-slate-500 mb-2">Set note</p>
                            <textarea
                              value={noteText}
                              onChange={e => setNoteText(e.target.value)}
                              placeholder="Add a note..."
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs resize-none"
                              rows={2}
                              autoFocus
                            />
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => { handleNoteChange(log.id, noteText); setEditingNote(null); }}
                                className="flex-1 py-1.5 bg-cyan-500 text-white rounded-lg text-xs font-bold">Save</button>
                              <button onClick={() => setEditingNote(null)}
                                className="px-3 py-1.5 text-slate-400 text-xs">Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Exercise quick-log cards */}
      <div className="space-y-2">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
          {todayLogs.length > 0 ? 'Add More Sets' : 'Start Training'}
        </p>
        {exercises.map(ex => {
          const isSelected = selectedEx === ex.id;
          const todayCount = todayLogs.filter(l => l.exerciseId === ex.id).length;
          const best = getBestSet(ex.id);
          const icon = BODY_PART_ICONS[ex.bodyPart] || '💪';
          const colors = COLOR_MAP[ex.color] || COLOR_MAP.cyan;

          return (
            <div key={ex.id} className={`glass-card rounded-2xl overflow-hidden transition-all ${
              isSelected ? `border ${colors.border}` : ''
            }`}>
              <button
                onClick={() => handleExpand(ex.id)}
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
                          onClick={() => setReps(Math.max(1, reps - 1))}
                          className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 transition-colors text-sm font-bold"
                        >−</button>
                        <span className="text-xl font-black text-white w-10 text-center">{reps}</span>
                        <button
                          onClick={() => setReps(reps + 1)}
                          className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 transition-colors text-sm font-bold"
                        >+</button>
                        <button
                          onClick={() => setReps(reps + 5)}
                          className="text-xs text-slate-500 hover:text-cyan-400 px-1"
                        >+5</button>
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
                      onClick={() => handleLog(ex.id)}
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