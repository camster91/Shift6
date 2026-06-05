import { useState } from 'react';
import { Save, Sun, Moon, ChevronRight, Trash2 } from 'lucide-react';
import { useArmorData } from '../context/ArmorDataContext';
import { EQUIPMENT_TRACKS, EXERCISE_TRACK, EXERCISE_DISPLAY_NAMES, getWeekConfig } from '../data/armorEngine';

/* ═══════════════════════════════════════════════════════════
   ARMOR SETTINGS v2.0 — Apple HIG
   Zero borders. Section grouping. Destructive confirmations.
   ═══════════════════════════════════════════════════════════ */

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <p className="armor-text-caption px-4 mb-1" style={{ letterSpacing: '0.1em' }}>{title}</p>
      <div className="armor-surface-1 overflow-hidden">{children}</div>
    </div>
  );
}

function Row({ label, value, onClick, danger, rightSlot }) {
  return (
    <button
      onClick={onClick}
      className="armor-press w-full flex items-center gap-3 px-4 py-3.5 text-left"
      style={{ borderTop: '0.5px solid rgba(255,255,255,0.04)' }}
    >
      <span className={`text-sm font-medium flex-1 ${danger ? 'text-red-400' : 'text-white'}`}>{label}</span>
      {value && <span className="text-sm font-bold text-cyan-400 tabular-nums">{value}</span>}
      {rightSlot}
      {!danger && !rightSlot && <ChevronRight size={16} className="text-slate-600" />}
    </button>
  );
}

function EditRow({ exId, displayName, value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(String(value));
  const empty = !value;

  return (
    <div className="flex items-center gap-3 px-4 py-3" style={{ borderTop: '0.5px solid rgba(255,255,255,0.04)' }}>
      <span className={`text-sm font-medium flex-1 ${empty ? 'text-slate-500' : 'text-white'}`}>
        {displayName || exId.replace(/_/g, ' ')}
      </span>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="number" value={v} onChange={e => setV(e.target.value)} autoFocus
            onKeyDown={e => e.key === 'Enter' && onSave(parseInt(v) || 0)}
            className="w-20 text-right rounded-lg px-2 py-1 text-sm font-bold text-white outline-none tabular-nums"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          />
          <button
            onClick={() => { onSave(parseInt(v) || 0); setEditing(false); }}
            aria-label="Save weight"
            className="armor-press p-1.5 rounded-lg"
            style={{ background: 'var(--color-accent)' }}
          >
            <Save size={14} className="text-white" />
          </button>
        </div>
      ) : (
        <button onClick={() => { setV(String(value || '')); setEditing(true); }}
          className="armor-press text-sm font-bold text-cyan-400 tabular-nums">
          {value ? <>{value} <span className="text-slate-600 text-xs">lbs</span></> : <span className="text-slate-600 text-xs font-medium">Set</span>}
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
        <h1 className="armor-text-large-title">Settings</h1>
        <p className="armor-text-footnote mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Track, 1RMs, and preferences.
        </p>
      </div>

      <div className="px-5 space-y-6">
        {/* Track */}
        <Section title="Equipment Track">
          {Object.values(EQUIPMENT_TRACKS).map((t, i) => {
            const selected = preferences.equipmentTrack === t.id;
            return (
              <button key={t.id} onClick={() => updatePreferences({ equipmentTrack: t.id })}
                className="armor-press w-full flex items-center gap-3 px-4 py-3.5 text-left"
                style={{ borderTop: i > 0 ? '0.5px solid rgba(255,255,255,0.04)' : 'none' }}>
                <span style={{ fontSize: '20px' }}>{t.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{t.label}</p>
                  <p className="text-[11px] text-slate-600">{t.sublabel}</p>
                </div>
                {selected && <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--color-accent)' }}>
                  <span className="text-white text-[10px]">✓</span>
                </div>}
              </button>
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
                  />
                ))}
              </div>
            );
          })}
          <p className="text-[11px] text-slate-700 px-4 py-3">
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
                <button key={t.id} onClick={() => updatePreferences({ theme: t.id })}
                  className="armor-press flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
                  style={{
                    background: selected ? 'rgba(6,182,212,0.08)' : 'rgba(255,255,255,0.02)',
                    color: selected ? 'var(--color-accent)' : 'var(--text-tertiary)',
                    boxShadow: selected ? '0 0 0 1px rgba(6,182,212,0.2)' : 'none'
                  }}>
                  <Icon size={16} />{t.label}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Cycle */}
        <Section title="Current Cycle">
          <div className="px-4 py-3 space-y-2" style={{ borderTop: '0.5px solid rgba(255,255,255,0.04)' }}>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Week</span>
              <span className="text-white font-bold tabular-nums">{currentCycle.week} / 6</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Day</span>
              <span className="text-white font-bold tabular-nums">{currentCycle.day} / 5</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Phase</span>
              <span className="text-cyan-400 font-bold">{weekConfig.phase}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Cycles Done</span>
              <span className="text-cyan-400 font-bold tabular-nums">{currentCycle.totalCyclesCompleted}</span>
            </div>
          </div>
        </Section>

        {/* Account */}
        <Section title="Profile">
          <div className="px-4 py-3" style={{ borderTop: '0.5px solid rgba(255,255,255,0.04)' }}>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Name</span>
              <span className="text-white font-bold">{userProfile.displayName || 'Athlete'}</span>
            </div>
          </div>
        </Section>

        {/* Destructive */}
        <Section title="Danger Zone">
          <Row label="Reset All Data" onClick={() => setShowReset(true)} danger />
        </Section>

        <p className="text-center text-[11px] text-slate-700 py-4">
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
              <button onClick={() => setShowReset(false)}
                className="armor-press flex-1 py-3 rounded-xl text-slate-400 font-bold"
                style={{ background: 'rgba(255,255,255,0.04)' }}>Cancel</button>
              <button onClick={() => { resetAll(); setShowReset(false); }}
                className="armor-press flex-1 py-3 rounded-xl text-white font-bold"
                style={{ background: 'var(--color-danger)' }}>Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
