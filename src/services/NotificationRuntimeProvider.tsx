import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { AppState } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getActiveTrainingCycle } from '../db/cycleRepository';
import { useLocalDatabase } from '../db/context';
import { getNotificationPreferences } from '../db/notificationRepository';
import { getOnboardingProfile } from '../db/profileRepository';
import { getUserProgramVersion } from '../db/programRepository';
import { createExpoNotificationProvider } from './notifications';
import type {
  NotificationResponsePayload,
  NotificationResponseSubscription,
} from './notifications';
import {
  refreshWorkoutReminderSchedule,
  type WorkoutReminderScheduleResult,
} from './notificationScheduler';
import { createSingleFlight } from './syncRuntime';

const guestUserId = 'guest-user';
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
  const [snapshot, setSnapshot] = useState<NotificationRuntimeSnapshot>(defaultSnapshot);

  const performRefresh = useCallback(async (): Promise<NotificationRuntimeSnapshot> => {
    if (!database) return { status: 'unavailable', scheduledCount: 0 };

    try {
      const [preferences, profile, cycle] = await Promise.all([
        getNotificationPreferences(database, guestUserId),
        getOnboardingProfile(database, guestUserId),
        getActiveTrainingCycle(database, guestUserId),
      ]);
      const programVersion = cycle
        ? ((await getUserProgramVersion(database, guestUserId, cycle.programVersionId))?.version ??
          null)
        : null;
      const result = await refreshWorkoutReminderSchedule(notificationProvider, {
        userId: guestUserId,
        preferences,
        cycle,
        programVersion,
        preferredTrainingTime: profile?.user.preferredTrainingTime ?? 'morning',
        now: new Date(),
      });
      const nextSnapshot: NotificationRuntimeSnapshot = {
        status: result.outcome,
        scheduledCount: result.scheduledCount,
      };
      setSnapshot(nextSnapshot);
      return nextSnapshot;
    } catch {
      const failedSnapshot: NotificationRuntimeSnapshot = { status: 'failed', scheduledCount: 0 };
      setSnapshot(failedSnapshot);
      return failedSnapshot;
    }
  }, [database]);

  const refreshNow = useMemo(() => createSingleFlight(performRefresh), [performRefresh]);

  useEffect(() => {
    if (!database) return;

    let active = true;
    let responseSubscription: NotificationResponseSubscription | null = null;
    const handleResponse = (response: NotificationResponsePayload) => {
      if (response.data.kind !== 'shift6-workout-reminder') return;
      const workoutId = response.data.workoutId;
      if (typeof workoutId !== 'string' || !workoutId.trim()) return;
      router.push({ pathname: '/workout', params: { workoutId } });
    };

    void notificationProvider
      .getLastResponse()
      .then((response) => {
        if (active && response) handleResponse(response);
      })
      .catch(() => undefined);
    void notificationProvider
      .subscribeToResponses(handleResponse)
      .then((subscription) => {
        if (active) responseSubscription = subscription;
        else subscription.remove();
      })
      .catch(() => undefined);

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refreshNow();
    });
    void refreshNow();
    return () => {
      active = false;
      responseSubscription?.remove();
      subscription.remove();
    };
  }, [database, refreshNow]);

  const value = useMemo(() => ({ ...snapshot, refreshNow }), [refreshNow, snapshot]);
  return (
    <NotificationRuntimeContext.Provider value={value}>
      {children}
    </NotificationRuntimeContext.Provider>
  );
}

export function useNotificationRuntime(): NotificationRuntimeContextValue {
  const context = useContext(NotificationRuntimeContext);
  if (!context) {
    throw new Error('useNotificationRuntime must be used within NotificationRuntimeProvider.');
  }
  return context;
}
