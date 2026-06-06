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
          <Button variant="primary" size="sm" icon={<Save size={14} />} onClick={() => handleSave(parseInt(v) || 0)} />
        </div>
      ) : (
        <button onClick={() => { setV(String(displayVal || '')); setEditing(true); }}
          className="armor-press px-3 py-1.5 rounded-lg bg-white/[0.04] transition-colors duration-300"
          disabled={saved}
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
                >
                  {u}
                </Button>
              );
            })}
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
