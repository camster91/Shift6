import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { clearBuilderRecovery, getBuilderRecovery } from '../db/builderRecoveryRepository';
import { getUserProgramVersion } from '../db/programRepository';
import type { BuilderRecoveryDraft, BuilderRecoverySnapshot } from '../domain/localPersistence';
import { createBuilderRecoveryWriter } from './builderRecoveryWriter';
type WriterState = {
  database: SQLiteDatabase;
  owner: string;
  route: string;
  writer: ReturnType<typeof createBuilderRecoveryWriter>;
  latest: BuilderRecoverySnapshot;
  baseline: string;
  committed: boolean;
  editing: boolean;
  choosing: boolean;
};
export function useBuilderRecovery({
  database,
  owner,
  route,
  ready,
  snapshot,
  committed,
  onResume,
}: {
  database: SQLiteDatabase | null;
  owner: string;
  route: string;
  ready: boolean;
  snapshot: BuilderRecoverySnapshot;
  committed: boolean;
  onResume: (
    snapshot: BuilderRecoverySnapshot,
    canonicalExists: boolean,
  ) => BuilderRecoverySnapshot;
}) {
  const [phase, setPhase] = useState<'loading' | 'choice' | 'editing' | 'blocked'>('loading');
  const [candidate, setCandidate] = useState<BuilderRecoveryDraft | null>(null);
  const [canonicalExists, setCanonicalExists] = useState(false);
  const [message, setMessage] = useState('');
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const state = useRef<WriterState | null>(null);
  const latest = useRef({ database, owner, route, snapshot, committed, onResume });
  latest.current = { database, owner, route, snapshot, committed, onResume };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = state.current;
  if (
    current &&
    current.database === database &&
    current.owner === owner &&
    current.route === route
  ) {
    current.latest = snapshot;
    current.committed = committed;
  }
  const isCurrent = (value: WriterState) =>
    state.current === value &&
    latest.current.database === value.database &&
    latest.current.owner === value.owner &&
    latest.current.route === value.route;
  const persist = async (value: WriterState) => {
    if (!value.editing || value.committed || JSON.stringify(value.latest) === value.baseline)
      return;
    const captured = value.latest;
    const text = JSON.stringify(captured);
    try {
      const written = await value.writer.save(captured);
      if (written && isCurrent(value) && JSON.stringify(value.latest) === text) {
        value.baseline = text;
        setMessage(
          'Recovery saved locally. Use Save draft program to add this plan to your saved plans.',
        );
      }
    } catch {
      if (isCurrent(value))
        setMessage(
          'Recovery could not be saved. Keep this screen open or save your plan explicitly; reopen to resolve any conflicting draft.',
        );
    }
  };
  useEffect(() => {
    if (!ready) {
      setPhase('loading');
      return;
    }
    setCandidate(null);
    setCanonicalExists(false);
    setMessage('');
    setBusy(false);
    if (!database) {
      setPhase('editing');
      setMessage('Local recovery is unavailable. Keep this preview open; nothing has been saved.');
      return;
    }
    let active = true;
    let value: WriterState | null = null;
    let background: { remove(): void } | null = null;
    setPhase('loading');
    void getBuilderRecovery(database, owner, route)
      .then(async (saved) => {
        const canonical = saved
          ? await getUserProgramVersion(database, owner, saved.snapshot.version.id)
          : null;
        if (
          !active ||
          latest.current.database !== database ||
          latest.current.owner !== owner ||
          latest.current.route !== route
        )
          return;
        value = {
          database,
          owner,
          route,
          writer: createBuilderRecoveryWriter(database, owner, route, saved),
          latest: latest.current.snapshot,
          baseline: JSON.stringify(latest.current.snapshot),
          committed: latest.current.committed,
          editing: !saved,
          choosing: false,
        };
        state.current = value;
        setCandidate(saved);
        setCanonicalExists(Boolean(canonical));
        setPhase(saved ? 'choice' : 'editing');
        background = AppState.addEventListener('change', (appState) => {
          if (appState !== 'active' && value) {
            if (timer.current) clearTimeout(timer.current);
            void persist(value);
          }
        });
      })
      .catch(() => {
        if (active) {
          setPhase('blocked');
          setMessage(
            'Private recovery could not be read safely. Retry or return to Programs; no draft was replaced.',
          );
        }
      });
    return () => {
      active = false;
      background?.remove();
      if (timer.current) clearTimeout(timer.current);
      if (value) {
        const previous = value;
        // Flush this owner's last rendered snapshot, never the next owner's refs.
        void persist(previous).finally(() => previous.writer.stop());
        if (state.current === previous) state.current = null;
      }
    };
  }, [database, owner, route, ready, retry]);
  const text = JSON.stringify(snapshot);
  useEffect(() => {
    const value = state.current;
    if (timer.current) clearTimeout(timer.current);
    if (phase !== 'editing' || !value || !isCurrent(value) || committed || text === value.baseline)
      return;
    setMessage('Saving private recovery locally…');
    timer.current = setTimeout(() => void persist(value), 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text, phase, committed, database, owner, route]);
  return {
    phase,
    candidate,
    canonicalExists,
    message,
    busy,
    retry: () => setRetry((value) => value + 1),
    resume: () => {
      const value = state.current;
      if (busy || !candidate || !value || value.choosing || value.editing || !isCurrent(value))
        return;
      value.choosing = true;
      const resumed = latest.current.onResume(candidate.snapshot, canonicalExists);
      value.latest = resumed;
      value.baseline = JSON.stringify(candidate.snapshot);
      value.editing = true;
      value.committed = false;
      setCandidate(null);
      setPhase('editing');
      setMessage(
        'Private draft resumed. Review recovered targets and text before saving or starting.',
      );
    },
    discard: async () => {
      const value = state.current;
      if (busy || !candidate || !value || value.choosing || value.editing || !isCurrent(value))
        return;
      value.choosing = true;
      setBusy(true);
      try {
        await clearBuilderRecovery(value.database, value.owner, candidate.id, candidate.revision);
        if (!isCurrent(value)) return;
        value.writer.stop();
        value.writer = createBuilderRecoveryWriter(value.database, value.owner, value.route, null);
        value.baseline = JSON.stringify(value.latest);
        value.editing = true;
        setCandidate(null);
        setPhase('editing');
        setMessage('Recovery discarded. Your saved plans were not deleted.');
      } catch {
        value.choosing = false;
        if (isCurrent(value))
          setMessage(
            'Recovery changed or could not be discarded. Retry loading before choosing a draft.',
          );
      } finally {
        if (isCurrent(value)) setBusy(false);
      }
    },
    clearAfterCanonical: async (savedSnapshot: BuilderRecoverySnapshot) => {
      const value = state.current;
      if (!value || !isCurrent(value)) return;
      if (timer.current) clearTimeout(timer.current);
      // Edits made while canonical Save was pending remain recoverable.
      if (JSON.stringify(value.latest) !== JSON.stringify(savedSnapshot)) {
        await persist(value);
        return;
      }
      try {
        await value.writer.save(savedSnapshot);
        if (!isCurrent(value) || JSON.stringify(value.latest) !== JSON.stringify(savedSnapshot))
          return;
        if (
          savedSnapshot.imports.some((entry) => entry.text.trim() || entry.previewText !== null)
        ) {
          value.baseline = JSON.stringify(value.latest);
          setMessage(
            'Plan saved locally. Unadded import text remains in private recovery for review.',
          );
          return;
        }
        const cleared = await value.writer.clearIfMatches(savedSnapshot);
        if (cleared && isCurrent(value)) {
          value.baseline = JSON.stringify(value.latest);
          value.committed = true;
          setMessage('Plan saved locally; recovery cleared.');
        }
      } catch {
        if (isCurrent(value))
          setMessage(
            'Plan saved locally, but its recovery could not be cleared. The recovery remains available.',
          );
      }
    },
  };
}
