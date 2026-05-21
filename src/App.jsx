import { useState, useEffect, useRef } from 'react';
import { Vibrate, Volume2, Smartphone } from 'lucide-react';
import { Play, BarChart3, Target, Dumbbell, Plus, Check } from 'lucide-react';
import { useData } from './hooks/useData';
import { t } from './i18n';
import Dashboard from './pages/Dashboard';
import LogPage from './pages/LogPage';
import GoalsPage from './pages/GoalsPage';
import ProgressPage from './pages/ProgressPage';
import ExerciseLibrary from './pages/ExerciseLibrary';
import WorkoutSession from './pages/WorkoutSession';
import { COLOR_MAP } from './data/exercises';
import Onboarding from './pages/Onboarding';


const TAB_BAR = [
  { id: 'home', label: t('common.home'), icon: Play },
  { id: 'log', label: t('common.log'), icon: Plus },
  { id: 'goals', label: t('common.goals'), icon: Target },
  { id: 'progress', label: t('common.progress'), icon: BarChart3 },
  { id: 'settings', label: t('common.settings'), icon: Dumbbell },
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
  };

  const handleWorkoutComplete = () => {
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
    const { settings, updateSettings, logs, exercises, myExercises, goals, setLogs, setMyExercises, setGoals } = useData();
    const [restMins, setRestMins] = useState(Math.floor((settings?.restSeconds || 90) / 60));
    const [restSecs, setRestSecs] = useState((settings?.restSeconds || 90) % 60);
    const [targetSets, setTargetSets] = useState(settings?.targetSets || 3);

    const handleSaveRest = () => {
      updateSettings({ restSeconds: restMins * 60 + restSecs });
      if (settings?.vibrationEnabled) navigator.vibrate?.(50);
    };

    const handleToggle = (key) => {
      updateSettings({ [key]: !settings?.[key] });
      if (key === 'vibrationEnabled') navigator.vibrate?.(30);
    };

    const handleResetData = () => {
      if (window.confirm(t('settings.resetData'))) {
        localStorage.removeItem('shift6_logs');
        localStorage.removeItem('shift6_goals');
        localStorage.removeItem('shift6_my_exercises');
        localStorage.removeItem('shift6_onboarding_done');
        localStorage.removeItem('shift6_settings');
        window.location.reload();
      }
    };

    const handleExport = () => {
      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        exercises: myExercises,
        logs,
        goals,
        settings,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shift6-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      if (settings?.vibrationEnabled) navigator.vibrate?.(30);
    };

    const handleImport = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          if (!data.version || !data.logs) throw new Error('Invalid backup file');
          if (window.confirm(`Import ${data.logs.length} logged sets? This will merge with existing data.`)) {
            // Merge logs (avoid duplicates by id)
            const existingIds = new Set(logs.map(l => l.id));
            const newLogs = data.logs.filter(l => !existingIds.has(l.id));
            const mergedLogs = [...logs, ...newLogs];
            setLogs(mergedLogs);
            if (data.exercises) setMyExercises(data.exercises);
            if (data.goals) setGoals(data.goals);
            if (data.settings) updateSettings(data.settings);
            if (settings?.vibrationEnabled) navigator.vibrate?.([50, 50, 50]);
            alert(`Imported ${newLogs.length} new sets!`);
          }
        } catch (err) {
          alert('Failed to import: ' + err.message);
        }
      };
      input.click();
    };

    const soundEnabled = settings?.soundEnabled ?? true;
    const vibrationEnabled = settings?.vibrationEnabled ?? true;
    const unit = settings?.unit || 'lbs';
    const theme = settings?.theme || 'dark';

    const handleThemeToggle = () => {
      const next = theme === 'dark' ? 'light' : 'dark';
      updateSettings({ theme: next });
      if (next === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
      if (settings?.vibrationEnabled) navigator.vibrate?.(20);
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
                <button onClick={() => { const v = Math.max(1, targetSets - 1); setTargetSets(v); updateSettings({ targetSets: v }); if (settings?.vibrationEnabled) navigator.vibrate?.(20); }}
                  className="w-10 h-10 rounded-lg bg-slate-700 text-white font-bold active:scale-90">−</button>
                <span className="w-12 text-center text-2xl font-black text-white">{targetSets}</span>
                <button onClick={() => { const v = Math.min(10, targetSets + 1); setTargetSets(v); updateSettings({ targetSets: v }); if (settings?.vibrationEnabled) navigator.vibrate?.(20); }}
                  className="w-10 h-10 rounded-lg bg-slate-700 text-white font-bold active:scale-90">+</button>
              </div>
            </div>
          </div>
        </div>

        {/* Sound & Haptics */}
        <div className="glass-card rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Sound & Haptics</h2>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 size={18} className="text-slate-400" />
              <div>
                <p className="text-sm text-white font-medium">Timer sound</p>
                <p className="text-xs text-slate-500">Beep when rest ends</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('soundEnabled')}
              className={`w-12 h-7 rounded-full transition-colors relative ${soundEnabled ? 'bg-cyan-500' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${soundEnabled ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Vibrate size={18} className="text-slate-400" />
              <div>
                <p className="text-sm text-white font-medium">Vibration</p>
                <p className="text-xs text-slate-500">Haptic feedback on actions</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('vibrationEnabled')}
              className={`w-12 h-7 rounded-full transition-colors relative ${vibrationEnabled ? 'bg-cyan-500' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${vibrationEnabled ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone size={18} className="text-slate-400" />
              <div>
                <p className="text-sm text-white font-medium">Weight unit</p>
                <p className="text-xs text-slate-500">Display preference</p>
              </div>
            </div>
            <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
              {['lbs', 'kg'].map(u => (
                <button key={u} onClick={() => { updateSettings({ unit: u }); if (settings?.vibrationEnabled) navigator.vibrate?.(20); }}
                  className={`px-3 py-1.5 rounded-md text-sm font-bold transition-colors ${unit === u ? 'bg-cyan-500 text-white' : 'text-slate-500'}`}>
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <svg size={18} className="text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              ) : (
                <svg size={18} className="text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              )}
              <div>
                <p className="text-sm text-white font-medium">Dark mode</p>
                <p className="text-xs text-slate-500">{theme === 'dark' ? 'On' : 'Off'}</p>
              </div>
            </div>
            <button
              onClick={handleThemeToggle}
              className={`w-12 h-7 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-cyan-500' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${theme === 'dark' ? 'left-6' : 'left-1'}`} />
            </button>
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

        {/* Backup / Restore */}
        <div className="glass-card rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Backup & Restore</h2>
          <div className="flex gap-3">
            <button onClick={handleExport}
              className="flex-1 py-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400 font-semibold text-sm hover:bg-cyan-500/20 active:scale-[0.98] transition-colors">
              Export Data
            </button>
            <button onClick={handleImport}
              className="flex-1 py-3 bg-slate-800/60 border border-slate-700/50 rounded-xl text-slate-300 font-semibold text-sm hover:bg-slate-700/60 active:scale-[0.98] transition-colors">
              Import Backup
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-2 text-center">JSON file with all your exercises, logs, and settings</p>
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
          workoutQueue={workoutQueue}
          workoutIndex={workoutIndex}
        />
      )}

      {/* PWA Install Banner */}
      {showInstallPrompt && (
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
