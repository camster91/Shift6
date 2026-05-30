import { useState, useEffect, useRef } from 'react';
import { Settings, Play, BarChart3, Target, Plus, Smartphone } from 'lucide-react';
import { useData } from './hooks/useData';
import { t } from './i18n';
import { trackEvent, Events } from './utils/analytics.js';
import Dashboard from './pages/Dashboard';
import LogPage from './pages/LogPage';
import GoalsPage from './pages/GoalsPage';
import ProgressPage from './pages/ProgressPage';
import ExerciseLibrary from './pages/ExerciseLibrary';
import WorkoutSession from './pages/WorkoutSession';
import Onboarding from './pages/Onboarding';
import SettingsPage from './pages/SettingsPage';


const TAB_BAR = [
  { id: 'home', label: t('common.home'), icon: Play },
  { id: 'log', label: t('common.log'), icon: Plus },
  { id: 'goals', label: t('common.goals'), icon: Target },
  { id: 'progress', label: t('common.progress'), icon: BarChart3 },
  { id: 'settings', label: t('common.settings'), icon: Settings },
];

export default function App() {
  const { exercises, onboardingDone, settings, logs } = useData();
  const [activeTab, setActiveTab] = useState('home');
  const [showLibrary, setShowLibrary] = useState(false);
  const [workoutExId, setWorkoutExId] = useState(null);
  const [workoutQueue, setWorkoutQueue] = useState([]);
  const [workoutIndex, setWorkoutIndex] = useState(0);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const installPromptRef = useRef(null);

  // PWA install prompt
  useEffect(() => {
    if (!onboardingDone) return;
    const handler = (e) => {
      e.preventDefault();
      installPromptRef.current = e;
      const dismissed = localStorage.getItem('shift6_install_dismissed');
      if (!dismissed) setShowInstallPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [onboardingDone]);

  // Apply saved theme on mount
  useEffect(() => {
    const savedTheme = settings?.theme || 'dark';
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light');
    }
    // Sync to legacy key for index.html pre-paint script
    try {
      localStorage.setItem('shift6_theme', savedTheme);
    } catch {}
  }, [settings?.theme]);

  const handleInstall = async () => {
    if (!installPromptRef.current) return;
    installPromptRef.current.prompt();
    await installPromptRef.current.userChoice;
    localStorage.setItem('shift6_install_dismissed', '1');
    setShowInstallPrompt(false);
    installPromptRef.current = null;
  };

  const handleStartWorkout = (exerciseId) => {
    setWorkoutExId(exerciseId);
    trackEvent(Events.WORKOUT_START, { exercise_id: exerciseId, mode: 'single' });
  };

  const handleStartStack = () => {
    if (exercises.length === 0) return;
    const ids = [...exercises]
      .sort((a, b) => {
        const aLast = logs
          .filter(l => l.exerciseId === a.id)
          .sort((x, y) => new Date(y.date) - new Date(x.date))[0];
        const bLast = logs
          .filter(l => l.exerciseId === b.id)
          .sort((x, y) => new Date(y.date) - new Date(x.date))[0];
        const aTime = aLast ? new Date(aLast.date).getTime() : 0;
        const bTime = bLast ? new Date(bLast.date).getTime() : 0;
        if (aTime === 0 && bTime > 0) return -1;
        if (bTime === 0 && aTime > 0) return 1;
        return aTime - bTime;
      })
      .map(e => e.id);
    setWorkoutQueue(ids);
    setWorkoutIndex(0);
    setWorkoutExId(ids[0]);
    trackEvent(Events.WORKOUT_START, { exercise_count: ids.length, mode: 'stack' });
  };

  const handleWorkoutComplete = () => {
    if (workoutQueue.length > 0 && workoutIndex < workoutQueue.length - 1) {
      setWorkoutIndex(prev => prev + 1);
      setWorkoutExId(workoutQueue[workoutIndex + 1]);
    } else {
      setWorkoutExId(null);
      setWorkoutQueue([]);
      setWorkoutIndex(0);
      trackEvent(Events.WORKOUT_COMPLETE, { exercises_completed: workoutQueue.length });
    }
  };

  const handleWorkoutCancel = () => {
    setWorkoutExId(null);
    setWorkoutQueue([]);
    setWorkoutIndex(0);
  };

  // Show onboarding if not done
  if (!onboardingDone) {
    return <Onboarding />;
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
          <div className="flex justify-around max-w-lg mx-auto" role="tablist">
            {TAB_BAR.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  aria-selected={isActive}
                  aria-label={tab.label}
                  className={`flex flex-col items-center py-3 px-5 transition-colors relative focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none rounded-lg ${
                    isActive ? 'text-cyan-400' : 'text-slate-500'
                  }`}
                >
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-cyan-400 rounded-full" />
                  )}
                  <Icon size={20} aria-hidden="true" />
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
          workoutQueue={workoutQueue}
          workoutIndex={workoutIndex}
        />
      )}

      {/* PWA Install Banner */}
      {!workoutExId && showInstallPrompt && (
        <div className="fixed bottom-20 left-4 right-4 max-w-lg mx-auto bg-slate-900 border border-cyan-500/30 rounded-2xl p-4 shadow-xl z-50 animate-slide-up">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <Smartphone size={20} className="text-cyan-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white mb-0.5">Add Shift6 to Home Screen</p>
              <p className="text-xs text-slate-500">Install for the best experience — quick access, no browser bar.</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleInstall}
              className="flex-1 py-2.5 bg-cyan-500 text-white rounded-xl text-sm font-bold active:scale-95">
              Install
            </button>
            <button onClick={() => { localStorage.setItem('shift6_install_dismissed', '1'); setShowInstallPrompt(false); }}
              className="px-4 py-2.5 text-slate-400 text-sm">
              Not now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
