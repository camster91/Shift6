import { useState, useEffect } from 'react';
import { useData } from './hooks/useData';
import { Play, Plus, BarChart3, Target, Dumbbell } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import LogPage from './pages/LogPage';
import GoalsPage from './pages/GoalsPage';
import ProgressPage from './pages/ProgressPage';
import ExerciseLibrary from './pages/ExerciseLibrary';
import WorkoutSession from './pages/WorkoutSession';

const TAB_BAR = [
  { id: 'home', label: 'Home', icon: Play },
  { id: 'log', label: 'Log', icon: Plus },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
];

export default function App() {
  const { exercises, onboardingDone } = useData();
  const [activeTab, setActiveTab] = useState('home');
  const [showLibrary, setShowLibrary] = useState(false);
  const [workoutExId, setWorkoutExId] = useState(null);
  // For sequential workout (multiple exercises)
  const [workoutQueue, setWorkoutQueue] = useState([]);
  const [workoutIndex, setWorkoutIndex] = useState(0);

  // Start a workout for a specific exercise
  const handleStartWorkout = (exerciseId) => {
    setWorkoutExId(exerciseId);
  };

  // Start a full stack: pick a random or sequential selection
  const handleStartStack = () => {
    if (exercises.length === 0) return;
    const ids = exercises.map(e => e.id);
    setWorkoutQueue(ids);
    setWorkoutIndex(0);
    setWorkoutExId(ids[0]);
  };

  // Complete current exercise → next in queue or done
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

  // Show onboarding if not done
  if (!onboardingDone) {
    return <Onboarding onComplete={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Main content */}
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
          </>
        )}
      </main>

      {/* Tab bar (hide during workout) */}
      {!workoutExId && !showLibrary && (
        <nav className="tab-bar">
          <div className="flex justify-around max-w-lg mx-auto">
            {TAB_BAR.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center py-3 px-5 transition-colors ${
                    isActive ? 'text-cyan-400' : 'text-slate-500'
                  }`}>
                  <Icon size={20} className={isActive ? '' : ''} />
                  <span className="text-xs mt-1">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Full-screen workout session */}
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

// ──────────── Minimal Onboarding ────────────
function Onboarding({ onComplete }) {
  const { exercises, setExerciseList, allExercises, setOnboardingDone } = useData();
  const [step, setStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filter, setFilter] = useState('all'); // all | home | gym
  const [search, setSearch] = useState('');

  const filtered = allExercises.filter(ex => {
    if (filter === 'home' && !ex.home) return false;
    if (filter === 'gym' && !ex.gym) return false;
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleFinish = () => {
    setExerciseList(selectedIds.length > 0 ? selectedIds : allExercises.filter(e => e.home).map(e => e.id));
    setOnboardingDone(true);
  };

  const toggleExercise = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-6">
      <div className="flex-1 max-w-lg mx-auto w-full">
        {/* Step indicator */}
        <div className="flex gap-2 mb-8">
          {[0, 1].map(i => (
            <div key={i} className={`flex-1 h-1 rounded-full ${i <= step ? 'bg-cyan-500' : 'bg-slate-800'}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                <Dumbbell size={36} className="text-cyan-400" />
              </div>
              <h1 className="text-3xl font-black mb-2">Shift6</h1>
              <p className="text-slate-400">Your personal exercise collection.<br />Pick what you do, swap anytime.</p>
            </div>
            <button onClick={() => setStep(1)}
              className="w-full py-4 bg-cyan-500 rounded-xl font-bold text-lg active:scale-95 transition-transform">
              Get Started
            </button>
            <button onClick={handleFinish}
              className="w-full py-3 text-slate-400 text-sm mt-2 active:scale-95 transition-transform">
              Skip — start with bodyweight
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-bold mb-2">Pick Your Exercises</h2>
            <p className="text-sm text-slate-400 mb-4">
              Choose {selectedIds.length} exercises — you can swap anytime
            </p>

            {/* Filter */}
            <div className="flex gap-2 mb-4">
              {[['all', 'All'], ['home', 'Home'], ['gym', 'Gym']].map(([id, label]) => (
                <button key={id} onClick={() => setFilter(id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium ${
                    filter === id ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Search */}
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search exercises..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-white text-sm mb-4 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500" />

            {/* Exercise grid */}
            <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto no-scrollbar">
              {filtered.map(ex => {
                const selected = selectedIds.includes(ex.id);
                return (
                  <button key={ex.id} onClick={() => toggleExercise(ex.id)}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      selected
                        ? 'bg-cyan-500/20 border-cyan-500'
                        : 'bg-slate-900 border-slate-800'
                    }`}>
                    <p className="text-sm font-bold text-white truncate">{ex.name}</p>
                    <p className="text-xs text-slate-500">{ex.bodyPart}</p>
                  </button>
                );
              })}
            </div>

            <button onClick={handleFinish}
              className="w-full py-4 bg-cyan-500 rounded-xl font-bold text-lg mt-6 active:scale-95 transition-transform">
              {selectedIds.length > 0 ? `Start with ${selectedIds.length} exercises` : 'Start with bodyweight'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
