import { useState, useEffect, useRef, useMemo } from 'react';
import { Play, BarChart3, Target, Dumbbell, Plus, TrendingUp, Check, X, RotateCcw, Trophy, Flame, Zap } from 'lucide-react';
import { useData } from './hooks/useData';
import { t } from './i18n';
import Dashboard from './pages/Dashboard';
import LogPage from './pages/LogPage';
import GoalsPage from './pages/GoalsPage';
import ProgressPage from './pages/ProgressPage';
import ExerciseLibrary from './pages/ExerciseLibrary';
import WorkoutSession from './pages/WorkoutSession';
import { COLOR_MAP } from './data/exercises';

const TAB_BAR = [
  { id: 'home', label: t('common.home'), icon: Play },
  { id: 'log', label: t('common.log'), icon: Plus },
  { id: 'goals', label: t('common.goals'), icon: Target },
  { id: 'progress', label: t('common.progress'), icon: BarChart3 },
  { id: 'settings', label: t('common.settings'), icon: Dumbbell },
];

export default function App() {
  const { exercises, onboardingDone } = useData();
  const [activeTab, setActiveTab] = useState('home');
  const [showLibrary, setShowLibrary] = useState(false);
  const [workoutExId, setWorkoutExId] = useState(null);
  const [workoutQueue, setWorkoutQueue] = useState([]);
  const [workoutIndex, setWorkoutIndex] = useState(0);

  const handleStartWorkout = (exerciseId) => {
    setWorkoutExId(exerciseId);
  };

  const handleStartStack = () => {
    if (exercises.length === 0) return;
    const ids = exercises.map(e => e.id);
    setWorkoutQueue(ids);
    setWorkoutIndex(0);
    setWorkoutExId(ids[0]);
  };

  const handleWorkoutComplete = (result) => {
    if (workoutQueue.length > 0 && workoutIndex < workoutQueue.length - 1) {
      setWorkoutIndex(prev => prev + 1);
      setWorkoutExId(workoutQueue[workoutIndex + 1]);
    } else {
      setWorkoutExId(null);
      setWorkoutQueue([]);
      setWorkoutIndex(0);
    }
  };

  const handleWorkoutCancel = () => {
    setWorkoutExId(null);
    setWorkoutQueue([]);
    setWorkoutIndex(0);
  };

  // Settings page component
  function SettingsPage() {
    const { settings, updateSettings, logs, exercises } = useData();
    const [restMins, setRestMins] = useState(Math.floor((settings?.restSeconds || 90) / 60));
    const [restSecs, setRestSecs] = useState((settings?.restSeconds || 90) % 60);
    const [targetSets, setTargetSets] = useState(settings?.targetSets || 3);

    const handleSaveRest = () => {
      updateSettings({ restSeconds: restMins * 60 + restSecs });
      navigator.vibrate?.(50);
    };

    const handleSaveSets = () => {
      updateSettings({ targetSets });
      navigator.vibrate?.(50);
    };

    const handleResetData = () => {
      if (window.confirm(t('settings.resetData'))) {
        localStorage.removeItem('shift6_logs');
        localStorage.removeItem('shift6_goals');
        window.location.reload();
      }
    };

    return (
      <div className="p-4 pb-32 max-w-lg mx-auto space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Dumbbell size={18} className="text-cyan-400" />
          <h1 className="text-xl font-bold text-white">{t('settings.title')}</h1>
        </div>

        {/* Workout defaults */}
        <div className="glass-card rounded-2xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{t('settings.workoutDefaults')}</h2>

          {/* Rest timer */}
          <div>
            <p className="text-sm text-slate-300 mb-2 font-medium">{t('settings.restBetweenSets')}</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-800 rounded-xl p-2">
                <input type="number" min="0" max="10" value={restMins}
                  onChange={e => setRestMins(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-12 bg-transparent text-center text-white font-bold text-lg" />
                <span className="text-slate-500 text-sm">{t('settings.minutes')}</span>
                <input type="number" min="0" max="59" step="15" value={restSecs}
                  onChange={e => setRestSecs(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-14 bg-transparent text-center text-white font-bold text-lg" />
                <span className="text-slate-500 text-sm">sec</span>
              </div>
              <button onClick={handleSaveRest}
                className="px-4 py-2 bg-cyan-500 text-white rounded-xl text-sm font-bold active:scale-95">
                {t('common.save')}
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-1">Current: {settings?.restSeconds || 90}s</p>
          </div>

          {/* Target sets */}
          <div>
            <p className="text-sm text-slate-300 mb-2 font-medium">{t('settings.targetSets')}</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1.5">
                <button onClick={() => setTargetSets(Math.max(1, targetSets - 1))}
                  className="w-10 h-10 rounded-lg bg-slate-700 text-white font-bold active:scale-90">−</button>
                <span className="w-12 text-center text-2xl font-black text-white">{targetSets}</span>
                <button onClick={() => setTargetSets(Math.min(10, targetSets + 1))}
                  className="w-10 h-10 rounded-lg bg-slate-700 text-white font-bold active:scale-90">+</button>
              </div>
              <button onClick={handleSaveSets}
                className="px-4 py-2 bg-cyan-500 text-white rounded-xl text-sm font-bold active:scale-95">
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Stats summary */}
        <div className="glass-card rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Your Data</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-white">{logs.length}</p>
              <p className="text-xs text-slate-500">Total sets logged</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-cyan-400">{exercises.length}</p>
              <p className="text-xs text-slate-500">Exercises tracked</p>
            </div>
          </div>
        </div>

        {/* Reset */}
        <div className="glass-card rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Data Management</h2>
          <button onClick={handleResetData}
            className="w-full py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 font-semibold text-sm hover:bg-red-500/20 active:scale-[0.98] transition-colors">
            Reset All Workout Data
          </button>
          <p className="text-xs text-slate-600 mt-2 text-center">Logs, goals, and streak will be cleared</p>
        </div>

        {/* App info */}
        <div className="text-center pt-2">
          <p className="text-slate-600 text-xs">Shift6 v1.0</p>
        </div>
      </div>
    );
  }

  // Show onboarding if not done
  if (!onboardingDone) {
    return <Onboarding onComplete={() => {}} onDone={() => window.location.reload()} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <main className="flex-1 overflow-y-auto">
        {showLibrary ? (
          <ExerciseLibrary onBack={() => setShowLibrary(false)} />
        ) : (
          <>
            {activeTab === 'home' && (
              <Dashboard
                onStartWorkout={handleStartStack}
                onOpenLog={() => setActiveTab('log')}
                onOpenLibrary={() => setShowLibrary(true)}
                onViewExercise={handleStartWorkout}
              />
            )}
            {activeTab === 'log' && <LogPage />}
            {activeTab === 'goals' && <GoalsPage />}
            {activeTab === 'progress' && <ProgressPage />}
            {activeTab === 'settings' && <SettingsPage />}
          </>
        )}
      </main>

      {!workoutExId && !showLibrary && (
        <nav className="tab-bar">
          <div className="flex justify-around max-w-lg mx-auto">
            {TAB_BAR.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center py-3 px-5 transition-colors relative ${
                    isActive ? 'text-cyan-400' : 'text-slate-500'
                  }`}>
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-cyan-400 rounded-full" />
                  )}
                  <Icon size={20} />
                  <span className="text-xs mt-1">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {workoutExId && (
        <WorkoutSession
          exerciseId={workoutExId}
          onComplete={handleWorkoutComplete}
          onCancel={handleWorkoutCancel}
        />
      )}
    </div>
  );
}

// ──────────── Onboarding ────────────
const BODY_PART_ICONS = {
  Chest: '💪', Back: '🔙', Shoulders: '🎯', Legs: '🦵',
  Arms: '💪', Core: '🔥', Glutes: '🍑',
};

function Onboarding({ onComplete, onDone }) {
  const { exercises, setExerciseList, allExercises, setOnboardingDone } = useData();
  const [step, setStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = allExercises.filter(ex => {
    if (filter === 'home' && !ex.home) return false;
    if (filter === 'gym' && !ex.gym) return false;
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleFinish = () => {
    // Default to bodyweight if nothing selected
    const chosen = selectedIds.length > 0
      ? selectedIds
      : allExercises.filter(e => e.home).map(e => e.id);
    setExerciseList(chosen);
    setOnboardingDone(true);
    // Force reload so App re-reads onboardingDone from localStorage
    if (onDone) onDone();
  };

  const toggleExercise = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-6 animate-fade-in">
      <div className="flex-1 max-w-lg mx-auto w-full">
        {/* Step indicator */}
        <div className="flex gap-2 mb-8 mt-4">
          {[0, 1].map(i => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
              i <= step ? 'bg-cyan-500' : 'bg-slate-800'
            }`} />
          ))}
        </div>

        {step === 0 && (
          <div className="animate-slide-up">
            <div className="text-center mb-10">
              <div className="w-24 h-24 rounded-full bg-cyan-500/20 border-2 border-cyan-500/30 flex items-center justify-center mx-auto mb-6">
                <Dumbbell size={40} className="text-cyan-400" />
              </div>
              <h1 className="text-4xl font-black mb-3 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Shift6
              </h1>
              <p className="text-slate-400 leading-relaxed">
                Your personal exercise collection.<br />
                <span className="text-cyan-400">Pick what you do, swap anytime.</span>
              </p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="w-full py-4 bg-cyan-500 rounded-2xl font-bold text-lg active:scale-95 transition-all shadow-lg shadow-cyan-500/20"
            >
              Get Started
            </button>
            <button
              onClick={handleFinish}
              className="w-full py-3 text-slate-500 text-sm mt-3 hover:text-slate-300 transition-colors"
            >
              Skip — start with bodyweight defaults
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold">Pick Your Exercises</h2>
              <span className="text-xs text-cyan-400 font-medium">
                {selectedIds.length} selected
              </span>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Tap exercises to build your collection
            </p>

            {/* Filter pills */}
            <div className="flex gap-2 mb-3">
              {[['all', 'All'], ['home', 'Home'], ['gym', 'Gym']].map(([id, label]) => (
                <button key={id} onClick={() => setFilter(id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    filter === id
                      ? 'bg-cyan-500 text-white shadow shadow-cyan-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search exercises..."
                className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
            </div>

            {/* Exercise grid — 2 cols, scrollable */}
            <div className="grid grid-cols-2 gap-2 max-h-[55vh] overflow-y-auto pr-1 no-scrollbar">
              {filtered.map(ex => {
                const selected = selectedIds.includes(ex.id);
                const colors = COLOR_MAP[ex.color] || COLOR_MAP.cyan;
                const icon = BODY_PART_ICONS[ex.bodyPart] || '💪';
                return (
                  <button
                    key={ex.id}
                    onClick={() => toggleExercise(ex.id)}
                    className={`p-3 rounded-xl text-left border transition-all relative overflow-hidden ${
                      selected
                        ? `${colors.bg} border-${colors.text}/50 shadow-lg`
                        : 'bg-slate-900/60 border-slate-800/50 hover:border-slate-700'
                    }`}
                  >
                    {selected && (
                      <span className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full ${colors.solid} flex items-center justify-center`}>
                        <Check size={10} className="text-white" />
                      </span>
                    )}
                    <div className={`w-8 h-8 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center mb-2`}>
                      <span className="text-sm">{icon}</span>
                    </div>
                    <p className="text-sm font-bold text-white leading-tight">{ex.name}</p>
                    <p className={`text-xs mt-0.5 ${colors.text}`}>{ex.bodyPart}</p>
                    {!ex.home && (
                      <span className="absolute bottom-1 right-1.5 text-[8px] text-slate-600">🏋️</span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleFinish}
              className={`w-full py-4 rounded-2xl font-bold text-lg mt-5 transition-all active:scale-95 ${
                selectedIds.length > 0
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {selectedIds.length > 0
                ? `Start with ${selectedIds.length} exercises`
                : 'Start with bodyweight defaults'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}