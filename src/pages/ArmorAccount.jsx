import { useState } from 'react';
import { LogIn, LogOut, RefreshCw, Check, AlertCircle, Cloud, CloudOff, GitMerge } from 'lucide-react';
import { useArmorData } from '../context/ArmorDataContext';
import { register, login, logout, getAuth, isLoggedIn, getApiBase } from '../lib/syncClient';
import { Card, PageHeader, Button } from '../components/ui';

/**
 * Armor Account — Login/register form, sync status, conflict resolution.
 * Apple HIG. Zero borders. Elevation layers.
 */

function StatusDot({ status }) {
  const map = {
    idle: { icon: Cloud, color: 'text-slate-400', label: 'Ready' },
    syncing: { icon: RefreshCw, color: 'text-cyan-400', label: 'Syncing', spin: true },
    synced: { icon: Check, color: 'text-emerald-400', label: 'Synced' },
    error: { icon: AlertCircle, color: 'text-amber-400', label: 'Sync issue' },
    offline: { icon: CloudOff, color: 'text-slate-400', label: 'Offline' },
  };
  const s = map[status] || map.idle;
  const Icon = s.icon;
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className={`${s.color} ${s.spin ? 'animate-spin' : ''}`} />
      <span className="text-sm font-medium text-slate-400">{s.label}</span>
    </div>
  );
}

function ConflictBanner({ conflict, onKeepLocal, onUseServer }) {
  if (!conflict) return null;
  return (
    <div className="armor-surface-1 p-4 border-amber-500/20 bg-amber-500/5">
      <div className="flex items-start gap-3 mb-3">
        <GitMerge size={18} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-white">Sync Conflict</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Server has newer data. Choose which version to keep.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onUseServer}
          className="armor-press flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-300"
          style={{ background: 'rgba(255,255,255,0.04)' }}>
          Use Server
        </button>
        <button onClick={onKeepLocal}
          className="armor-press flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: 'var(--color-accent)' }}>
          Keep Local
        </button>
      </div>
    </div>
  );
}

function ProfileSection() {
  const { userProfile } = useArmorData();
  const auth = getAuth();
  const displayName = auth?.user?.displayName || userProfile?.displayName || '';
  const email = auth?.user?.email || userProfile?.email || '';
  const initials = displayName
    ? displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || displayName[0].toUpperCase()
    : 'A';

  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
          style={{ background: 'var(--color-accent)', color: 'var(--elevation-0-bg)' }}>
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-white truncate">{displayName || 'Athlete'}</p>
          <p className="text-sm text-slate-400 truncate">{email || 'Not signed in'}</p>
        </div>
      </div>
    </Card>
  );
}

function SyncStatusCard() {
  const { syncStatus, lastSyncAt } = useArmorData();

  return (
    <Card>
      <div className="flex items-center justify-between">
        <StatusDot status={syncStatus} />
        {lastSyncAt && (
          <p className="text-[11px] text-slate-400">
            Last synced: {new Date(lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </Card>
  );
}

function DataExportButton() {
  const { userProfile, preferences, estimated1RMs, workoutHistory, streakData, currentCycle } = useArmorData();

  const handleExport = () => {
    const data = { userProfile, preferences, estimated1RMs, workoutHistory, streakData, currentCycle, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `armor-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button onClick={handleExport}
      className="armor-press w-full py-3 rounded-xl text-sm font-bold text-slate-300"
      style={{ background: 'rgba(255,255,255,0.04)' }}>
      Export my data
    </button>
  );
}

function LoginForm() {
  const { pullFromCloud } = useArmorData();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [, setApiBaseState] = useState(getApiBase());

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'register') {
        await register(email, password, name || undefined);
      } else {
        await login(email, password);
      }
      await pullFromCloud();
      setApiBaseState(getApiBase());
    } catch (err) {
      setError(err.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {mode === 'register' && (
        <div>
          <label className="armor-text-caption block mb-1.5">Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Your name" autoComplete="name" maxLength={50}
            className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-700 outline-none"
            style={{ background: 'var(--elevation-1-bg)' }} />
        </div>
      )}
      <div>
        <label className="armor-text-caption block mb-1.5">Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          required placeholder="you@example.com" autoComplete="email" maxLength={100}
          className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-700 outline-none"
          style={{ background: 'var(--elevation-1-bg)' }} />
      </div>
      <div>
        <label className="armor-text-caption block mb-1.5">Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          required minLength={8} placeholder="8+ characters" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          maxLength={128}
          className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-700 outline-none"
          style={{ background: 'var(--elevation-1-bg)' }} />
      </div>

      {error && (
        <p className="text-xs text-red-400 px-1">{error}</p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="md"
        icon={submitting ? <Check size={16} /> : <LogIn size={16} />}
        disabled={submitting}
        className="w-full"
      >
        {submitting ? 'Signing in...' : mode === 'login' ? 'Sign In' : 'Create Account'}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => { setError(null); setMode(mode === 'login' ? 'register' : 'login'); }}
        className="w-full"
      >
        {mode === 'login' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
      </Button>
    </form>
  );
}

function LoggedInCard() {
  const { user, lastSyncAt } = getAuth();
  const { pullFromCloud, syncStatus, conflict, resolveConflictKeepLocal, resolveConflictUseServer, logout: ctxLogout } = useArmorData();
  const [pulse, setPulse] = useState(false);

  const handlePull = async () => {
    setPulse(true);
    await pullFromCloud();
    setTimeout(() => setPulse(false), 600);
  };

  const handleLogout = () => {
    if (confirm('Sign out? Local data will remain. To delete cloud data, sign in and use Reset.')) {
      logout();
      ctxLogout?.();
    }
  };

  return (
    <div className="armor-surface-2 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
          style={{ background: 'var(--color-accent)', color: 'var(--elevation-0-bg)' }}>
          {(user?.displayName || user?.email || '?').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{user?.displayName || user?.email}</p>
          <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <StatusDot status={syncStatus} />
        {lastSyncAt && (
          <p className="text-[10px] text-slate-400">
            {new Date(lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={handlePull}
          className={`armor-press flex-1 py-2.5 rounded-xl text-sm font-bold text-white ${pulse ? 'opacity-80' : ''}`}
          style={{ background: 'var(--color-accent)' }}>
          <RefreshCw size={14} className={`inline mr-1.5 ${pulse ? 'animate-spin' : ''}`} />
          Pull Now
        </button>
        <button onClick={handleLogout}
          className="armor-press px-4 py-2.5 rounded-xl text-sm font-bold text-slate-400"
          style={{ background: 'rgba(255,255,255,0.04)' }}>
          <LogOut size={14} className="inline mr-1.5" />
          Sign Out
        </button>
      </div>

      {conflict && (
        <div className="mt-3">
          <ConflictBanner conflict={conflict} onKeepLocal={resolveConflictKeepLocal} onUseServer={resolveConflictUseServer} />
        </div>
      )}
    </div>
  );
}

export default function ArmorAccount() {
  const loggedIn = isLoggedIn();

  return (
    <div className="px-5 pt-8 pb-32 space-y-4">
      <PageHeader
        title="Account"
        description="Sign in to sync across devices. Local data is always safe."
      />

      <div className="space-y-3">
        <ProfileSection />
        {loggedIn && <SyncStatusCard />}
        <Card><DataExportButton /></Card>
      </div>

      {loggedIn ? <LoggedInCard /> : (
        <Card>
          <LoginForm />
        </Card>
      )}

      <div className="text-center text-[10px] text-slate-400 px-4">
        <p>Your data stays on this device until you sign in.</p>
        <p>Sync uses a revision counter — no data loss from conflicts.</p>
      </div>
    </div>
  );
}
