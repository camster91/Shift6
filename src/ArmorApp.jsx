import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import {
  Play, BarChart3, Settings as SettingsIcon, Smartphone, User
} from 'lucide-react';
import { useArmorData, migrateFromShift6 } from './context/ArmorDataContext';
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
import WorkoutSummary from './components/WorkoutSummary';
import { getTodaysWorkout } from './data/armorEngine';

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
    logWorkout, persistenceFailed, currentCycle, userProfile, workoutHistory,
    setModifier,
  } = armor;

  const [activeTab, setActiveTab] = useState('home');
  const [workoutActive, setWorkoutActive] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [workoutSummary, setWorkoutSummary] = useState(null);
  const installPromptRef = useRef(null);
  const migrated = useRef(false);

  // Check for Shift6 migration on first load
  useEffect(() => {
    if (!onboardingDone && !migrated.current) {
      // Idempotent: skip if already migrated on a previous load.
      const migrationMarker = (() => { try { return localStorage.getItem('armor_migrated_from_shift6'); } catch { return null; } })();
      if (migrationMarker) return;
      const migratedData = migrateFromShift6();
      if (migratedData) {
        // migrateFromShift6 returns a full DEFAULT_DATA-shaped object with
        // the user's real 1RMs from the legacy shift6_* keys. Apply it
        // through completeOnboarding so the rest of the app sees the
        // same flow as a fresh signup.
        completeOnboarding(migratedData.userProfile.displayName ? {
          equipmentTrack: migratedData.preferences.equipmentTrack,
          estimated1RMs: migratedData.userProfile.estimated1RMs,
          displayName: migratedData.userProfile.displayName,
        } : migratedData);
        try { localStorage.setItem('armor_migrated_from_shift6', '1'); } catch {}
      }
      migrated.current = true;
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
    } else {
      document.documentElement.classList.remove('light');
    }
    // Sync the browser chrome theme color (PWA status bar, Android taskbar,
    // Safari address bar) with the active theme. Without this the status
    // bar stays dark on a light theme and looks jarring.
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', theme === 'light' ? '#f1f5f9' : '#020617');
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
    // Show the post-workout summary. Compute the next workout preview
    // using the same engine the dashboard uses, so the user sees what
    // they're up against next. The summary covers the "did it work?"
    // confirmation gap and the "what's next" planning beat.
    const completedCount = (workoutHistory?.length || 0) + 1;
    const isFirstWorkout = completedCount === 1;
    const isCycleComplete = workoutData?.week >= 6 && workoutData?.day >= 5;
    // For an empty (bailed-out) workout, fall back to the user's current
    // cycle position so the next-workout preview still renders.
    const baseDay = workoutData?.day || currentCycle?.day || 1;
    const baseWeek = workoutData?.week || currentCycle?.week || 1;
    const nextDay = baseDay >= 5 ? 1 : baseDay + 1;
    const nextWeek = baseDay >= 5
      ? (baseWeek >= 6 ? 1 : baseWeek + 1)
      : baseWeek;
    const track = preferences?.equipmentTrack || 'full_gym';
    const nextWorkout = getTodaysWorkout(track, nextDay, nextWeek, {}, userProfile?.estimated1RMs || {});
    setWorkoutSummary({ workout: workoutData, nextWorkout, isFirstWorkout, isCycleComplete });
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
    <div className="min-h-screen bg-[var(--elevation-0-bg)] text-[var(--text-primary)] flex flex-col">
      <UpdatePrompt />
      {/* Persistence warning — shown when localStorage writes are failing.
          Private mode / quota exceeded / disabled storage: data lives only
          in memory until the user takes action. */}
      {persistenceFailed && (
        <div
          role="alert"
          className="bg-[var(--color-warning-muted)] text-[var(--color-warning)] text-xs px-4 py-2 text-center font-medium"
        >
          ⚠️ Data isn't being saved. Check browser storage permissions and reload.
        </div>
      )}
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
                <ArmorDashboard
                  onStartWorkout={handleStartWorkout}
                  onNavigateToSettings={() => setActiveTab('settings')}
                />
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
            className="flex justify-around py-2 px-2 rounded-2xl border border-[var(--color-divider)]"
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
                      ? 'text-[var(--color-accent)]'
                      : 'text-[var(--text-disabled)]'
                  }`}
                >
                  {isActive && (
                    <span className="absolute inset-0 bg-[var(--color-accent-muted)] rounded-xl" />
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
              <p className="text-sm font-bold text-[var(--text-primary)] mb-0.5">Add Armor to Home Screen</p>
              <p className="text-[11px] text-[var(--text-tertiary)]">Quick access between sets — no browser bar.</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleInstall}
              className="armor-press flex-1 py-2.5 rounded-xl text-[var(--text-primary)] text-sm font-bold bg-[var(--color-accent)]">
              Install
            </button>
            <button onClick={() => { localStorage.setItem('armor_install_dismissed', '1'); setShowInstallPrompt(false); }}
              className="px-4 py-2.5 text-[var(--text-secondary)] text-sm font-medium">
              Not now
            </button>
          </div>
        </div>
      )}

      {/* Post-workout summary — fires when a workout completes.
          Sits at z-90 (above install prompt at z-50, below lazy chunks).
          Closes on backdrop click and on the Done button. */}
      {workoutSummary && (
        <WorkoutSummary
          workout={workoutSummary.workout}
          nextWorkout={workoutSummary.nextWorkout}
          isFirstWorkout={workoutSummary.isFirstWorkout}
          isCycleComplete={workoutSummary.isCycleComplete}
          onApplyDeload={() => setModifier('highFatigue', true)}
          onDismiss={() => setWorkoutSummary(null)}
        />
      )}
    </div>
  );
}
