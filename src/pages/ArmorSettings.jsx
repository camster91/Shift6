import { useState, useRef, useEffect } from 'react';
import { Save, Sun, Moon, Trash2 } from 'lucide-react';
import { useArmorData } from '../context/ArmorDataContext';
import { EQUIPMENT_TRACKS, EXERCISE_TRACK, EXERCISE_DISPLAY_NAMES, getWeekConfig } from '../data/armorEngine';
import { Card, PageHeader, SectionHeader, Button, Toggle } from '../components/ui';

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

// Settings row layout — label on the left, control on the right. Has
// hairline divider that we toggle off for the first row.
function SettingRow({ children, divider = true }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 ${divider ? 'armor-divider' : ''}`}
    >
      {children}
    </div>
  );
}

function EditRow({ exId, displayName, value, onSave, unit = 'lbs' }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(String(value));
  const [saved, setSaved] = useState(false);
  const empty = !value;
  const savedTimerRef = useRef(null);

  const displayVal = unit === 'kg' ? Math.round(value / 2.20462) : value;

  // Parse + validate the input. Accepts decimals (kg mode) and integers (lbs mode).
  // Negative or non-numeric input is rejected with no save.
  const handleSave = (rawValue) => {
    const num = parseFloat(rawValue);
    if (!Number.isFinite(num) || num < 0 || num > 9999) {
      setEditing(false);
      return;
    }
    // Drop fractional lbs (would be a fake 224.7 lb squat), keep fractional kg.
    const clean = unit === 'lbs' ? Math.round(num) : Math.round(num * 100) / 100;
    const saveVal = unit === 'kg' ? Math.round(clean * 2.20462) : clean;
    onSave(saveVal);
    setEditing(false);
    if (clean > 0) {
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 1200);
    }
  };

  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  return (
    <SettingRow divider>
      <span className={`text-sm font-medium flex-1 ${empty ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
        {displayName || exId.replace(/_/g, ' ')}
      </span>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="number" value={v} onChange={e => setV(e.target.value)} autoFocus
            min="0" max="9999" step={unit === 'kg' ? '0.5' : '1'}
            onKeyDown={e => e.key === 'Enter' && handleSave(v)}
            className="w-20 text-right rounded-lg px-2 py-1 text-sm font-bold text-[var(--text-primary)] outline-none tabular-nums bg-[var(--color-surface-2)] focus-visible:outline-[var(--color-accent)]"
          />
          <Button variant="primary" size="sm" icon={<Save size={14} />} onClick={() => handleSave(v)} />
        </div>
      ) : (
        <button
          onClick={() => { setV(String(displayVal || '')); setEditing(true); }}
          className="armor-press px-3 py-1.5 rounded-lg bg-[var(--color-surface-1)] transition-colors duration-300"
          disabled={saved}
        >
          <span className={`text-sm font-bold tabular-nums transition-colors duration-300 ${saved ? 'text-[var(--color-success)]' : 'text-[var(--color-accent)]'}`}>
            {value ? (
              <>
                {displayVal}
                {saved && <span className="ml-1 text-[var(--color-success)]" aria-label="saved">✓</span>}
                <span className="text-[var(--text-tertiary)] text-xs"> {unit}</span>
              </>
            ) : (
              <span className="text-[var(--text-tertiary)] text-xs font-medium">Set</span>
            )}
          </span>
        </button>
      )}
    </SettingRow>
  );
}

// Track selector card — used in the "Equipment Track" section.
function TrackCard({ track, selected, onClick }) {
  return (
    <Card
      interactive
      padded={false}
      onClick={onClick}
      aria-pressed={selected}
    >
      {selected && (
        <span
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[var(--elevation-0-bg)] text-[10px] font-bold"
          style={{ background: 'var(--color-accent)' }}
        >
          ✓
        </span>
      )}
      <div className="flex items-center gap-2 px-4 py-3.5">
        <span className="text-2xl" aria-hidden="true">{track.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[var(--text-primary)]">{track.label}</p>
          <p className="armor-text-caption">{track.sublabel}</p>
        </div>
      </div>
    </Card>
  );
}

export default function ArmorSettings() {
  const { preferences, userProfile, estimated1RMs, currentCycle, updatePreferences, set1RM, resetAll } = useArmorData();
  const [showReset, setShowReset] = useState(false);

  const weekConfig = getWeekConfig(currentCycle.week);

  // Notification toggle helpers — small, readable, single source of truth.
  const toggleNotif = (key) => {
    const notifs = preferences.notifications || {};
    updatePreferences({
      notifications: { ...notifs, [key]: { ...(notifs[key] || {}), enabled: !(notifs[key]?.enabled || false) } },
    });
  };
  const setNotifField = (key, field, value) => {
    const notifs = preferences.notifications || {};
    updatePreferences({
      notifications: { ...notifs, [key]: { ...(notifs[key] || {}), [field]: value } },
    });
  };
  const toggleMarketing = () => {
    const notifs = preferences.notifications || {};
    updatePreferences({ notifications: { ...notifs, marketing: !(notifs.marketing || false) } });
  };

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
        {/* Equipment Track */}
        <Section title="Equipment Track">
          <div className="p-2 space-y-2">
            {Object.values(EQUIPMENT_TRACKS).map(t => (
              <TrackCard
                key={t.id}
                track={t}
                selected={preferences.equipmentTrack === t.id}
                onClick={() => updatePreferences({ equipmentTrack: t.id })}
              />
            ))}
          </div>
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
              <div key={trackId} className={trackIdx > 0 ? 'armor-divider-strong' : ''}>
                <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                  <span className="text-base" aria-hidden="true">{t.icon}</span>
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
          <p className="armor-text-footnote px-4 py-3">
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
          <div className="py-1">
            {/* Daily habits reminder */}
            <SettingRow>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">Daily habits reminder</p>
                <p className="armor-text-footnote">A gentle nudge to do your walks, balance work, and floor stretches</p>
              </div>
              <Toggle
                checked={preferences.notifications?.habits?.enabled || false}
                ariaLabel="Toggle daily habits reminder"
                onChange={() => toggleNotif('habits')}
              />
            </SettingRow>
            {preferences.notifications?.habits?.enabled && (
              <SettingRow>
                <span className="armor-text-footnote w-12 shrink-0">Time</span>
                <input
                  type="time"
                  value={preferences.notifications?.habits?.time || '21:00'}
                  onChange={e => setNotifField('habits', 'time', e.target.value)}
                  className="flex-1 armor-surface-2 text-[var(--text-primary)] text-xs rounded-lg px-3 py-2 outline-none focus-visible:outline-[var(--color-accent)] tabular-nums"
                />
              </SettingRow>
            )}

            {/* Workout reminder */}
            <SettingRow>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">Workout reminder</p>
                <p className="armor-text-footnote">Remind me on specific days</p>
              </div>
              <Toggle
                checked={preferences.notifications?.workout?.enabled || false}
                ariaLabel="Toggle workout reminder"
                onChange={() => toggleNotif('workout')}
              />
            </SettingRow>
            {preferences.notifications?.workout?.enabled && (
              <SettingRow>
                <div className="flex gap-1.5 flex-wrap w-full">
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
                          setNotifField('workout', 'days', newDays);
                        }}
                        className={`armor-press w-8 h-8 rounded-full text-[11px] font-bold transition-colors ${
                          active
                            ? 'bg-[var(--color-accent)] text-[var(--elevation-0-bg)]'
                            : 'bg-[var(--color-surface-1)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </SettingRow>
            )}

            {/* Marketing emails */}
            <SettingRow>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">Product updates</p>
                <p className="armor-text-footnote">New features and tips · we never spam</p>
              </div>
              <Toggle
                checked={preferences.notifications?.marketing || false}
                ariaLabel="Toggle product updates"
                onChange={toggleMarketing}
              />
            </SettingRow>
          </div>
        </Section>

        {/* Cycle */}
        <Section title="Current Cycle">
          <div className="py-1">
            <SettingRow>
              <span className="text-sm text-[var(--text-secondary)]">Week</span>
              <span className="text-sm text-[var(--text-primary)] font-bold tabular-nums">{currentCycle.week} / 6</span>
            </SettingRow>
            <SettingRow>
              <span className="text-sm text-[var(--text-secondary)]">Day</span>
              <span className="text-sm text-[var(--text-primary)] font-bold tabular-nums">{currentCycle.day} / 5</span>
            </SettingRow>
            <SettingRow>
              <span className="text-sm text-[var(--text-secondary)]">Phase</span>
              <span className="text-sm text-[var(--color-accent)] font-bold">{weekConfig.phase}</span>
            </SettingRow>
            <SettingRow>
              <span className="text-sm text-[var(--text-secondary)]">Cycles Done</span>
              <span className="text-sm text-[var(--color-accent)] font-bold tabular-nums">{currentCycle.totalCyclesCompleted}</span>
            </SettingRow>
          </div>
        </Section>

        {/* Account */}
        <Section title="Profile">
          <SettingRow>
            <span className="text-sm text-[var(--text-secondary)]">Name</span>
            <span className="text-sm text-[var(--text-primary)] font-bold">{userProfile.displayName || 'Athlete'}</span>
          </SettingRow>
        </Section>

        {/* Destructive */}
        <Section title="Danger Zone">
          <div className="p-3">
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
          </div>
        </Section>

        <p className="text-center armor-text-footnote py-4">
          Armor v3.0.0 · Build {new Date().toISOString().split('T')[0]}
        </p>
      </div>

      {/* Reset modal */}
      {showReset && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xl"
          onClick={() => setShowReset(false)}
        >
          <div
            className="armor-surface-3 w-full max-w-sm p-6 armor-entrance"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center bg-[var(--color-danger-muted)]">
              <Trash2 size={22} className="text-[var(--color-danger)]" />
            </div>
            <h3 className="text-lg font-black text-[var(--text-primary)] text-center mb-1">Reset Everything?</h3>
            <p className="text-sm text-[var(--text-secondary)] text-center mb-6">
              This deletes all workout history, 1RMs, settings, and your streak. Cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" size="md" onClick={() => setShowReset(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={() => { resetAll(); setShowReset(false); }}
                className="flex-1"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
