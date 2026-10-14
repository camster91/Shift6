import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { AppState } from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getActiveTrainingCycle } from '../db/cycleRepository';
import { useLocalDatabase } from '../db/context';
import { getNotificationPreferences } from '../db/notificationRepository';
import { getOnboardingProfile } from '../db/profileRepository';
import { getUserProgramVersion } from '../db/programRepository';
import { createExpoNotificationProvider } from './notifications';
import { subscribeToSafeNotificationResponses } from './notificationResponsePolicy';
import {
  refreshWorkoutReminderSchedule,
  type WorkoutReminderScheduleResult,
} from './notificationScheduler';
import { createTrailingRefresh } from './notificationRefresh';
import { getWorkoutScheduleOverrides, getWorkoutScheduleSessions } from '../db/calendarRepository';
import { useCurrentUserId } from './UserIdentityProvider';

const notificationProvider = createExpoNotificationProvider();

export type NotificationRuntimeStatus =
  'idle' | WorkoutReminderScheduleResult['outcome'] | 'failed';

export interface NotificationRuntimeSnapshot {
  status: NotificationRuntimeStatus;
  scheduledCount: number;
}

export interface NotificationRuntimeContextValue extends NotificationRuntimeSnapshot {
  refreshNow: () => Promise<NotificationRuntimeSnapshot>;
}

const defaultSnapshot: NotificationRuntimeSnapshot = { status: 'idle', scheduledCount: 0 };
const NotificationRuntimeContext = createContext<NotificationRuntimeContextValue | null>(null);

export function NotificationRuntimeProvider({ children }: { children: ReactNode }) {
  const database = useLocalDatabase();
  const userId = useCurrentUserId();
  // Returning to the same owner/database creates a distinct actor; retained
  // callbacks belong to the original actor and cannot adopt its successor.
  const actor = useMemo(() => ({ database, userId }), [database, userId]);
  const currentActor = useRef(actor);
  currentActor.current = actor;
  const current = useRef({ database, userId });
  current.current = { database, userId };
  const mountedLease = useRef<{
    database: typeof database;
    userId: string;
    actor: typeof actor;
    active: boolean;
  } | null>(null);
  const [snapshotRecord, setSnapshotRecord] = useState<{
    actor: typeof actor;
    snapshot: NotificationRuntimeSnapshot;
  } | null>(null);

  const performRefresh = useCallback(async (): Promise<NotificationRuntimeSnapshot> => {
    if (!database) return { status: 'unavailable', scheduledCount: 0 };
    const lease = mountedLease.current;
    const isCurrent = () =>
      !!lease &&
      lease.active &&
      lease.actor === actor &&
      currentActor.current === actor &&
      mountedLease.current === lease &&
      lease.database === database &&
      lease.userId === userId &&
      current.current.database === database &&
      current.current.userId === userId;
    const stale: NotificationRuntimeSnapshot = { status: 'stale-context', scheduledCount: 0 };
    if (!isCurrent()) return stale;

    try {
      const records = await Promise.all([
        getNotificationPreferences(database, userId),
        getOnboardingProfile(database, userId),
        getActiveTrainingCycle(database, userId),
      ]);
      if (!isCurrent()) return stale;
      const [preferences, profile, cycle] = captureRecords(records);
      const programVersion = cycle
        ? captureRecords(
            (await getUserProgramVersion(database, userId, cycle.programVersionId))?.version ??
              null,
          )
        : null;
      if (!isCurrent()) return stale;
      const calendar = cycle
        ? await Promise.all([
            getWorkoutScheduleOverrides(database, userId, cycle.id),
            getWorkoutScheduleSessions(database, cycle.id),
          ])
        : [[], []];
      if (!isCurrent()) return stale;
      const [overrides, sessions] = captureRecords(calendar);
      const result = await refreshWorkoutReminderSchedule(
        notificationProvider,
        {
          userId,
          preferences,
          cycle,
          programVersion,
          overrides,
          sessions,
          preferredTrainingTime: profile?.user.preferredTrainingTime ?? 'morning',
          now: new Date(),
        },
        isCurrent,
      );
      if (!isCurrent() || result.outcome === 'stale-context') return stale;
      const nextSnapshot: NotificationRuntimeSnapshot = {
        status: result.outcome,
        scheduledCount: result.scheduledCount,
      };
      setSnapshotRecord({ actor, snapshot: nextSnapshot });
      return nextSnapshot;
    } catch {
      if (!isCurrent()) return stale;
      const failedSnapshot: NotificationRuntimeSnapshot = { status: 'failed', scheduledCount: 0 };
      setSnapshotRecord({ actor, snapshot: failedSnapshot });
      return failedSnapshot;
    }
  }, [actor, database, userId]);

  const refreshNow = useMemo(() => createTrailingRefresh(performRefresh), [performRefresh]);

  useEffect(() => {
    if (!database) return;
    const lease = { database, userId, actor, active: true };
    mountedLease.current = lease;

    const stopResponses = subscribeToSafeNotificationResponses(
      notificationProvider,
      userId,
      () =>
        lease.active &&
        currentActor.current === actor &&
        mountedLease.current === lease &&
        current.current.database === database &&
        current.current.userId === userId,
      () => router.push('/'),
    );

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refreshNow();
    });
    void refreshNow();
    return () => {
      lease.active = false;
      stopResponses();
      subscription.remove();
    };
  }, [actor, database, refreshNow, userId]);

  // Filter synchronously during render, before passive effects or fresh reads.
  // A replacement/deleted database must never expose its predecessor's status.
  const snapshot: NotificationRuntimeSnapshot = !database
    ? { status: 'unavailable', scheduledCount: 0 }
    : snapshotRecord?.actor === actor
      ? snapshotRecord.snapshot
      : defaultSnapshot;
  const value = useMemo(() => ({ ...snapshot, refreshNow }), [refreshNow, snapshot]);
  return (
    <NotificationRuntimeContext.Provider value={value}>
      {children}
    </NotificationRuntimeContext.Provider>
  );
}

function captureRecords<T>(records: T): T {
  return JSON.parse(JSON.stringify(records)) as T;
}

export function useNotificationRuntime(): NotificationRuntimeContextValue {
  const context = useContext(NotificationRuntimeContext);
  if (!context) {
    throw new Error('useNotificationRuntime must be used within NotificationRuntimeProvider.');
  }
  return context;
}
