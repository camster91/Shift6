import { useState } from 'react';
import { Volume2, Vibrate, Smartphone, Bell, Dumbbell } from 'lucide-react';
import { useData } from '../hooks/useData';
import { t } from '../i18n';
import { trackEvent, Events } from '../utils/analytics.js';
import { requestNotificationPermission, scheduleWorkoutReminder, cancelWorkoutReminder } from '../utils/notifications.js';

export default function SettingsPage() {
  const { settings, updateSettings, logs, exercises, myExercises, goals, setLogs, setMyExercises, setGoals } = useData();
  const [restMins, setRestMins] = useState(Math.floor((settings?.restSeconds || 90) / 60));
  const [restSecs, setRestSecs] = useState((settings?.restSeconds || 90) % 60);
  const [targetSets, setTargetSets] = useState(settings?.targetSets || 3);
  const [pendingReset, setPendingReset] = useState(false);

  const handleSaveRest = () => {
    updateSettings({ restSeconds: restMins * 60 + restSecs });
    if (settings?.vibrationEnabled) navigator.vibrate?.(50);
  };

  const handleToggle = (key) => {
    updateSettings({ [key]: !settings?.[key] });
    if (key === 'vibrationEnabled') navigator.vibrate?.(30);
  };

  const handleResetData = () => {
    if (pendingReset) {
      localStorage.removeItem('shift6_logs');
      localStorage.removeItem('shift6_goals');
      localStorage.removeItem('shift6_my_exercises');
      localStorage.removeItem('shift6_onboarding_done');
      localStorage.removeItem('shift6_settings');
      window.location.reload();
    } else {
      setPendingReset(true);
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

  const [pendingImport, setPendingImport] = useState(null);

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
        if (pendingImport?.fileName === file.name && pendingImport?.logCount === data.logs.length) {
          const existingIds = new Set(logs.map(l => l.id));
          const newLogs = data.logs.filter(l => !existingIds.has(l.id));
          const mergedLogs = [...logs, ...newLogs];
          setLogs(mergedLogs);
          if (data.exercises) setMyExercises(data.exercises);
          if (data.goals) setGoals(data.goals);
          if (data.settings) updateSettings(data.settings);
          if (settings?.vibrationEnabled) navigator.vibrate?.([50, 50, 50]);
          alert(`Imported ${newLogs.length} new sets!`);
          setPendingImport(null);
        } else {
          setPendingImport({ fileName: file.name, logCount: data.logs.length });
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

      {/* Notifications */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Reminders</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell size={18} className="text-slate-400" />
            <div>
              <p className="text-sm text-white font-medium">Daily workout reminder</p>
              <p className="text-xs text-slate-500">{settings?.notificationsEnabled ? `Scheduled at ${String(settings?.notificationHour||7).padStart(2,'0')}:${String(settings?.notificationMinute||0).padStart(2,'0')}` : 'Off'}</p>
            </div>
          </div>
          <button
            onClick={async () => {
              const next = !settings?.notificationsEnabled;
              if (next) {
                const granted = await requestNotificationPermission();
                if (!granted) { alert('Notification permission denied. Enable it in device settings.'); return; }
                await scheduleWorkoutReminder(settings?.notificationHour || 7, settings?.notificationMinute || 0);
                trackEvent(Events.NOTIFICATION_ENABLED);
              } else {
                await cancelWorkoutReminder();
              }
              updateSettings({ notificationsEnabled: next });
              if (settings?.vibrationEnabled) navigator.vibrate?.(30);
            }}
            className={`w-12 h-7 rounded-full transition-colors relative ${settings?.notificationsEnabled ? 'bg-cyan-500' : 'bg-slate-700'}`}
          >
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${settings?.notificationsEnabled ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
        {settings?.notificationsEnabled && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Time</span>
            <div className="flex items-center gap-2 bg-slate-800 rounded-xl p-2 flex-1">
              <input type="number" min="0" max="23" value={settings?.notificationHour || 7}
                onChange={async e => {
                  const h = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
                  updateSettings({ notificationHour: h });
                  await scheduleWorkoutReminder(h, settings?.notificationMinute || 0);
                }}
                className="w-12 bg-transparent text-center text-white font-bold text-lg" />
              <span className="text-slate-500 text-sm">:</span>
              <input type="number" min="0" max="59" step="5" value={settings?.notificationMinute || 0}
                onChange={async e => {
                  const m = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                  updateSettings({ notificationMinute: m });
                  await scheduleWorkoutReminder(settings?.notificationHour || 7, m);
                }}
                className="w-14 bg-transparent text-center text-white font-bold text-lg" />
            </div>
          </div>
        )}
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
          className={`w-full py-3 rounded-xl font-semibold text-sm active:scale-[0.98] transition-colors ${
            pendingReset
              ? 'bg-red-500 text-white font-bold'
              : 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
          }`}>
          {pendingReset ? 'TAP AGAIN TO CONFIRM RESET' : 'Reset All Workout Data'}
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
            className={`flex-1 py-3 rounded-xl font-semibold text-sm active:scale-[0.98] transition-colors ${
              pendingImport
                ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400'
                : 'bg-slate-800/60 border border-slate-700/50 text-slate-300 hover:bg-slate-700/60'
            }`}>
            {pendingImport ? 'Confirm Import' : 'Import Backup'}
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-2 text-center">{pendingImport ? `${pendingImport.logCount} sets ready to import` : 'JSON file with all your exercises, logs, and settings'}</p>
      </div>

      {/* App info */}
      <div className="text-center pt-2">
        <p className="text-slate-600 text-xs">Shift6 v1.0</p>
      </div>
    </div>
  );
}
