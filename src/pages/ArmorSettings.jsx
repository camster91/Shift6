import { useState } from 'react';
import { Save, Sun, Moon, Trash2 } from 'lucide-react';
import { useArmorData } from '../context/ArmorDataContext';
import { EQUIPMENT_TRACKS, EXERCISE_TRACK, EXERCISE_DISPLAY_NAMES, getWeekConfig } from '../data/armorEngine';
import { Card, PageHeader, SectionHeader, Button } from '../components/ui';

/* ═══════════════════════════════════════════════════════════
   ARMOR SETTINGS v2.0 — Apple HIG
   Zero borders. Section grouping. Destructive confirmations.
   ═══════════════════════════════════════════════════════════ */

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <SectionHeader label={title} />
      <Card>{children}</Card>
    </div>
  );
}

function EditRow({ exId, displayName, value, onSave, unit = 'lbs' }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(String(value));
  const [saved, setSaved] = useState(false);
  const empty = !value;

  const displayVal = unit === 'kg' ? Math.round(value / 2.20462) : value;

  const handleSave = (numValue) => {
    const saveVal = unit === 'kg' ? Math.round(numValue * 2.20462) : numValue;
    onSave(saveVal);
    setEditing(false);
    if (numValue) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3" style={{ borderTop: '0.5px solid rgba(255,255,255,0.04)' }}>
      <span className={`text-sm font-medium flex-1 ${empty ? 'text-slate-400' : 'text-white'}`}>
        {displayName || exId.replace(/_/g, ' ')}
      </span>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="number" value={v} onChange={e => setV(e.target.value)} autoFocus
            onKeyDown={e => e.key === 'Enter' && handleSave(parseInt(v) || 0)}
            className="w-20 text-right rounded-lg px-2 py-1 text-sm font-bold text-white outline-none tabular-nums"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          />
          <Button variant="primary" size="sm" icon={<Save size={14} />} onClick={() => handleSave(parseInt(v) || 0)} aria-label={`Save ${displayName || exId.replace(/_/g, ' ')}`} />
        </div>
      ) : (
        <button onClick={() => { setV(String(displayVal || '')); setEditing(true); }}
          className="armor-press px-3 py-1.5 rounded-lg bg-white/[0.04] transition-colors duration-300"
          disabled={saved}
          aria-label={`Edit ${displayName || exId.replace(/_/g, ' ')}`}
        >
          <span className={`text-sm font-bold tabular-nums transition-colors duration-300 ${saved ? 'text-emerald-400' : 'text-cyan-400'}`}>
            {value ? (
              <>
                {displayVal}
                {saved && <span className="ml-1 text-emerald-400">✓</span>}
                <span className="text-slate-400 text-xs"> {unit}</span>
              </>
            ) : (
              <span className="text-slate-400 text-xs font-medium">Set</span>
            )}
          </span>
        </button>
      )}
    </div>
  );
}

export default function ArmorSettings() {
  const { preferences, userProfile, estimated1RMs, currentCycle, updatePreferences, set1RM, resetAll } = useArmorData();
  const [showReset, setShowReset] = useState(false);

  const weekConfig = getWeekConfig(currentCycle.week);

  return (
    <div className="pb-32 max-w-lg mx-auto">
      {/* Header */}
      <div className="px-5 pt-8 pb-6">
        <PageHeader
          title="Settings"
          description="Track, 1RMs, and preferences."
        />
      </div>

      <div className="px-5 space-y-6">
        {/* Track */}
        <Section title="Equipment Track">
          {Object.values(EQUIPMENT_TRACKS).map((t, i) => {
            const selected = preferences.equipmentTrack === t.id;
            return (
              <div
                key={t.id}
                onClick={() => updatePreferences({ equipmentTrack: t.id })}
                style={{ borderTop: i > 0 ? '0.5px solid rgba(255,255,255,0.04)' : 'none' }}
              >
                <Card interactive padded={false} className="flex items-center gap-3 px-4 py-3.5">
                  <span style={{ fontSize: '20px' }}>{t.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{t.label}</p>
                    <p className="text-[11px] text-slate-400">{t.sublabel}</p>
                  </div>
                  {selected && <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--color-accent)' }}>
                    <span className="text-white text-[10px]">✓</span>
                  </div>}
                </Card>
              </div>
            );
          })}
        </Section>

        {/* 1RMs — grouped by track so the user can set 1RMs for both
            Full Gym and Home Gym independently, then switch between them
            per-workout from the dashboard. */}
        <Section title="Estimated 1RMs">
          {Object.entries(EQUIPMENT_TRACKS).map(([trackId, t], trackIdx) => {
            const trackExercises = Object.entries(EXERCISE_TRACK)
              .filter(([, exTrack]) => exTrack === trackId)
              .map(([exId]) => exId);
            return (
              <div key={trackId} className={trackIdx > 0 ? '' : ''}
                style={trackIdx > 0 ? { borderTop: '0.5px solid rgba(255,255,255,0.04)' } : undefined}>
                <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                  <span style={{ fontSize: '14px' }}>{t.icon}</span>
                  <span className="armor-text-caption" style={{ letterSpacing: '0.08em' }}>{t.label}</span>
                </div>
                {trackExercises.map(exId => (
                  <EditRow
                    key={exId}
                    exId={exId}
                    displayName={EXERCISE_DISPLAY_NAMES[exId]}
                    value={estimated1RMs[exId] || 0}
                    onSave={(v) => set1RM(exId, v)}
                    unit={preferences.unit}
                  />
                ))}
              </div>
            );
          })}
          <p className="text-[11px] text-slate-400 px-4 py-3">
            Auto-progresses +5 lbs upper / +10 lbs lower per 6-week cycle. Set 1RMs for both tracks
            so you can switch seamlessly between gym and home sessions.
          </p>
        </Section>

        {/* Theme */}
        <Section title="Theme">
          <div className="flex gap-2 p-3">
            {[
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'light', label: 'Light', icon: Sun },
            ].map(t => {
              const Icon = t.icon;
              const selected = preferences.theme === t.id;
              return (
                <Button
                  key={t.id}
                  variant={selected ? 'primary' : 'secondary'}
                  size="sm"
                  icon={<Icon size={16} />}
                  onClick={() => updatePreferences({ theme: t.id })}
                  className="flex-1"
                  aria-pressed={selected}
                >
                  {t.label}
                </Button>
              );
            })}
          </div>
        </Section>

        {/* Unit */}
        <Section title="Weight Unit">
          <div className="flex gap-2 p-3">
            {['lbs', 'kg'].map(u => {
              const selected = preferences.unit === u;
              return (
                <Button
                  key={u}
                  variant={selected ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => updatePreferences({ unit: u })}
                  className="flex-1"
                  aria-pressed={selected}
                >
                  {u}
                </Button>
              );
            })}
          </div>
        </Section>

        {/* Reminders */}
        <Section title="Reminders">
          <div className="px-4 py-3 space-y-3">
            {/* Daily habits reminder */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">Daily habits reminder</p>
                <p className="text-[11px] text-slate-400">A gentle nudge to do your walks, balance work, and floor stretches</p>
              </div>
              <button
                role="switch"
                aria-checked={preferences.notifications?.habits?.enabled || false}
                aria-label="Toggle daily habits reminder"
                onClick={() => updatePreferences({ notifications: { ...preferences.notifications, habits: { ...preferences.notifications?.habits, enabled: !(preferences.notifications?.habits?.enabled || false) } } })}
                className={`armor-press relative w-11 h-6 rounded-full transition-colors ${(preferences.notifications?.habits?.enabled || false) ? 'bg-cyan-500' : 'bg-white/[0.1]'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${(preferences.notifications?.habits?.enabled || false) ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            {(preferences.notifications?.habits?.enabled || false) && (
              <div className="flex items-center gap-3 pl-2">
                <span className="text-[11px] text-slate-400">Time</span>
                <input
                  type="time"
                  value={preferences.notifications?.habits?.time || '21:00'}
                  onChange={e => updatePreferences({ notifications: { ...preferences.notifications, habits: { ...preferences.notifications?.habits, time: e.target.value } } })}
                  className="flex-1 bg-white/[0.05] text-white text-xs rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-cyan-500/40"
                />
              </div>
            )}

            <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.04)' }} />

            {/* Workout reminder */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">Workout reminder</p>
                <p className="text-[11px] text-slate-400">Remind me on specific days</p>
              </div>
              <button
                role="switch"
                aria-checked={preferences.notifications?.workout?.enabled || false}
                aria-label="Toggle workout reminder"
                onClick={() => updatePreferences({ notifications: { ...preferences.notifications, workout: { ...preferences.notifications?.workout, enabled: !(preferences.notifications?.workout?.enabled || false) } } })}
                className={`armor-press relative w-11 h-6 rounded-full transition-colors ${(preferences.notifications?.workout?.enabled || false) ? 'bg-cyan-500' : 'bg-white/[0.1]'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${(preferences.notifications?.workout?.enabled || false) ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            {(preferences.notifications?.workout?.enabled || false) && (
              <div className="flex gap-1.5 flex-wrap pl-2">
                {['M','T','W','Th','F','Sa','Su'].map((d, i) => {
                  const dayKey = ['mon','tue','wed','thu','fri','sat','sun'][i];
                  const active = (preferences.notifications?.workout?.days || []).includes(dayKey);
                  return (
                    <button
                      key={d}
                      aria-pressed={active}
                      aria-label={['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][i]}
                      onClick={() => {
                        const currentDays = preferences.notifications?.workout?.days || [];
                        const newDays = active
                          ? currentDays.filter(x => x !== dayKey)
                          : [...currentDays, dayKey];
                        updatePreferences({ notifications: { ...preferences.notifications, workout: { ...preferences.notifications?.workout, days: newDays } } });
                      }}
                      className={`armor-press w-8 h-8 rounded-full text-[11px] font-bold transition-colors ${active ? 'bg-cyan-500 text-black' : 'bg-white/[0.06] text-slate-400'}`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.04)' }} />

            {/* Marketing emails */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">Product updates</p>
                <p className="text-[11px] text-slate-400">New features and tips · we never spam</p>
              </div>
              <button
                role="switch"
                aria-checked={preferences.notifications?.marketing || false}
                aria-label="Toggle product updates"
                onClick={() => updatePreferences({ notifications: { ...preferences.notifications, marketing: !(preferences.notifications?.marketing || false) } })}
                className={`armor-press relative w-11 h-6 rounded-full transition-colors ${(preferences.notifications?.marketing || false) ? 'bg-cyan-500' : 'bg-white/[0.1]'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${(preferences.notifications?.marketing || false) ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </Section>

        {/* Cycle */}
        <Section title="Current Cycle">
          <div className="px-4 py-3 space-y-2" style={{ borderTop: '0.5px solid rgba(255,255,255,0.04)' }}>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Week</span>
              <span className="text-white font-bold tabular-nums">{currentCycle.week} / 6</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Day</span>
              <span className="text-white font-bold tabular-nums">{currentCycle.day} / 5</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Phase</span>
              <span className="text-cyan-400 font-bold">{weekConfig.phase}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Cycles Done</span>
              <span className="text-cyan-400 font-bold tabular-nums">{currentCycle.totalCyclesCompleted}</span>
            </div>
          </div>
        </Section>

        {/* Account */}
        <Section title="Profile">
          <div className="px-4 py-3" style={{ borderTop: '0.5px solid rgba(255,255,255,0.04)' }}>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Name</span>
              <span className="text-white font-bold">{userProfile.displayName || 'Athlete'}</span>
            </div>
          </div>
        </Section>

        {/* Destructive */}
        <Section title="Danger Zone">
          <Button
            variant="danger"
            size="md"
            icon={<Trash2 size={16} />}
            onClick={() => setShowReset(true)}
            className="w-full"
            aria-label="Delete all workout data and start over"
          >
            Reset All Data
          </Button>
        </Section>

        <p className="text-center text-[11px] text-slate-400 py-4">
          Armor v3.0.0 · Build {new Date().toISOString().split('T')[0]}
        </p>
      </div>

      {/* Reset modal — elevation-4 */}
      {showReset && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)' }}
          onClick={() => setShowReset(false)}>
          <div className="armor-surface-3 w-full max-w-sm p-6 armor-entrance"
            onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.1)' }}>
              <Trash2 size={22} className="text-red-400" />
            </div>
            <h3 className="text-lg font-black text-white text-center mb-1">Reset Everything?</h3>
            <p className="text-sm text-slate-400 text-center mb-6">
              This deletes all workout history, 1RMs, settings, and your streak. Cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" size="md" onClick={() => setShowReset(false)} className="flex-1">
                Cancel
              </Button>
              <Button variant="danger" size="md" onClick={() => { resetAll(); setShowReset(false); }} className="flex-1">
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
