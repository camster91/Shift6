import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import {
  Play, BarChart3, Settings as SettingsIcon, Smartphone, User
} from 'lucide-react';
import { useArmorData } from './context/ArmorDataContext';
import ArmorDashboard from './pages/ArmorDashboard';
const ArmorWorkoutSession = lazy(() => import('./pages/ArmorWorkoutSession'));
// Account page is lazy-loaded so the cloud-sync bundle (~12KB of syncClient
// + form code) is only fetched when the user actually opens the Account tab.
// When VITE_SYNC_ENABLED is not set, the tab is hidden and this chunk is
// never downloaded.
const ArmorAccount = lazy(() => import('./pages/ArmorAccount'));
import ArmorOnboarding from './pages/ArmorOnboarding';
import ArmorSettings from './pages/ArmorSettings';
import ArmorProgress from './pages/ArmorProgress';
import UpdatePrompt from './components/UpdatePrompt';
import FirstRunTour from './components/FirstRunTour';

/**
 * ARMOR App — Main application shell.
 * Tab-based navigation:
 *   home → Dashboard (today's workout, habits, modifiers)
 *   workout → WorkoutSession (active workout)
 *   progress → Progress charts & cycle history
 *   settings → Settings
 */

const TAB_BAR = [
  { id: 'home', label: 'Today', icon: Play },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  // Cloud sync is a future feature. The Account tab is hidden by default
  // and only appears when the app is built with VITE_SYNC_ENABLED=1.
  // The sync code in src/lib/syncClient.js and the ArmorAccount page are
  // preserved and functional, but they call sync.getshift6.com which has
  // no live backend yet. Setting the env var is opt-in.
  ...(import.meta.env.VITE_SYNC_ENABLED === '1' || import.meta.env.VITE_SYNC_ENABLED === 'true'
    ? [{ id: 'account', label: 'Account', icon: User }]
    : []),
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function ArmorApp() {
  const armor = useArmorData();
  const {
    onboardingDone, preferences, completeOnboarding,
    logWorkout,
  } = armor;

  const [activeTab, setActiveTab] = useState('home');
  const [workoutActive, setWorkoutActive] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const installPromptRef = useRef(null);
  const migrated = useRef(false);

  // Check for Shift6 migration on first load
  useEffect(() => {
    if (!onboardingDone && !migrated.current) {
      const migrationMarker = (() => { try { return localStorage.getItem('armor_migrated_from_shift6'); } catch { return null; } })();
      if (migrationMarker) return;
      const oldOnboarding = (() => { try { const v = localStorage.getItem('shift6_onboarding_done'); return v ? JSON.parse(v) : false; } catch { return false; } })();
      if (oldOnboarding) {
        const oldSettings = (() => { try { const v = localStorage.getItem('shift6_settings'); return v ? JSON.parse(v) : null; } catch { return null; } })();
        // Read the user's REAL 1RMs from old Shift6 data instead of overwriting
        // with hardcoded defaults. The 185/135/225 placeholders previously
        // shipped here were silent data loss for anyone who set real numbers.
        const old1RMs = oldSettings?.estimated1RMs || oldSettings?.oneRMs || {};
        completeOnboarding({
          equipmentTrack: oldSettings?.equippedIds?.includes('barbell') ? 'full_gym' : 'home_gym',
          estimated1RMs: {
            barbell_squat: old1RMs.barbell_squat || old1RMs.squat || 0,
            bench_press: old1RMs.bench_press || old1RMs.bench || 0,
            deadlift: old1RMs.deadlift || 0,
            barbell_row: old1RMs.barbell_row || 0,
            shoulder_press: old1RMs.shoulder_press || 0,
            goblet_squat: old1RMs.goblet_squat || 0,
            dumbbell_press: old1RMs.dumbbell_press || 0,
            romanian_deadlift: old1RMs.romanian_deadlift || 0,
          },
          displayName: oldSettings?.displayName || 'Athlete',
        });
        try { localStorage.setItem('armor_migrated_from_shift6', '1'); } catch {}
        migrated.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PWA install prompt
  useEffect(() => {
    if (!onboardingDone) return;
    const handler = (e) => {
      e.preventDefault();
      installPromptRef.current = e;
      const dismissed = localStorage.getItem('armor_install_dismissed');
      if (!dismissed) setShowInstallPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [onboardingDone]);

  // Apply saved theme on mount
  useEffect(() => {
    const theme = preferences?.theme || 'dark';
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    }
    try {
      localStorage.setItem('armor_theme', theme);
    } catch (e) { /* ignore */ }
  }, [preferences?.theme]);

  const handleInstall = async () => {
    if (!installPromptRef.current) return;
    installPromptRef.current.prompt();
    await installPromptRef.current.userChoice;
    localStorage.setItem('armor_install_dismissed', '1');
    setShowInstallPrompt(false);
    installPromptRef.current = null;
  };

  const handleStartWorkout = () => {
    setWorkoutActive(true);
  };

  const handleWorkoutComplete = (workoutData) => {
    logWorkout(workoutData);
    setWorkoutActive(false);
  };

  const handleWorkoutCancel = () => {
    setWorkoutActive(false);
  };

  // Show onboarding if not done
  if (!onboardingDone) {
    return (
      <main role="main" aria-label="Onboarding">
        <ArmorOnboarding />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <UpdatePrompt />
      <main role="main" aria-label="Armor workout app" className="flex-1 overflow-y-auto">
        {workoutActive ? (
          <Suspense fallback={null}>
            <ArmorWorkoutSession
              onComplete={handleWorkoutComplete}
              onCancel={handleWorkoutCancel}
            />
          </Suspense>
        ) : (
          <>
            {activeTab === 'home' && (
              <>
                <ArmorDashboard onStartWorkout={handleStartWorkout} />
                <FirstRunTour />
              </>
            )}
            {activeTab === 'progress' && <ArmorProgress />}
            {activeTab === 'account' && (
              <Suspense fallback={null}>
                <ArmorAccount />
              </Suspense>
            )}
            {activeTab === 'settings' && <ArmorSettings />}
          </>
        )}
      </main>

      {!workoutActive && (
        <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm">
          <div
            className="flex justify-around py-2 px-2 rounded-2xl border border-white/5"
            role="tablist"
            style={{ background: 'var(--elevation-0-bg)', boxShadow: 'var(--elevation-3-shadow)' }}
          >
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
                  className={`armor-press flex flex-col items-center py-2 px-4 rounded-xl transition-all relative ${
                    isActive
                      ? 'text-cyan-400'
                      : 'text-slate-600'
                  }`}
                >
                  {isActive && (
                    <span className="absolute inset-0 bg-cyan-500/10 rounded-xl" />
                  )}
                  <Icon size={20} aria-hidden="true" className="relative z-10" strokeWidth={isActive ? 2.5 : 1.5} />
                  <span className={`text-[10px] mt-0.5 font-semibold relative z-10 ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* PWA Install Banner */}
      {!workoutActive && showInstallPrompt && (
        <div className="fixed bottom-24 left-4 right-4 max-w-sm mx-auto rounded-2xl p-4 z-50 armor-entrance"
          style={{ background: 'var(--elevation-3-bg)', boxShadow: 'var(--elevation-3-shadow)', backdropFilter: 'blur(var(--elevation-3-blur))' }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-accent-muted)' }}>
              <Smartphone size={20} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white mb-0.5">Add Armor to Home Screen</p>
              <p className="text-[11px] text-slate-500">Quick access between sets — no browser bar.</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleInstall}
              className="armor-press flex-1 py-2.5 rounded-xl text-white text-sm font-bold"
              style={{ background: 'var(--color-accent)' }}>
              Install
            </button>
            <button onClick={() => { localStorage.setItem('armor_install_dismissed', '1'); setShowInstallPrompt(false); }}
              className="px-4 py-2.5 text-slate-400 text-sm font-medium">
              Not now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
