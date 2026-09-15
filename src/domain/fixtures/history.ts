import { buildWorkoutHistoryEntry, type WorkoutHistoryEntry } from '../history';
import { demoCycle, demoWorkout } from './home';

export const demoWorkoutHistory: WorkoutHistoryEntry[] = [
  buildWorkoutHistoryEntry({
    id: 'demo-history-complete',
    cycleId: demoCycle.id,
    cycleWeek: 1,
    workoutId: demoWorkout.id,
    title: demoWorkout.title,
    focus: demoWorkout.focus,
    status: 'complete',
    startedAt: '2026-09-14T12:00:00.000Z',
    completedAt: '2026-09-14T12:30:00.000Z',
    isOffline: true,
    completedSetCount: 11,
    totalVolume: 2850,
    totalDurationSeconds: 0,
    totalDistanceMeters: 0,
  }),
  buildWorkoutHistoryEntry({
    id: 'demo-history-partial',
    cycleId: demoCycle.id,
    cycleWeek: 1,
    workoutId: 'workout-cardio-a',
    title: 'Cardio A',
    focus: 'cardio',
    status: 'partial',
    startedAt: '2026-09-13T12:00:00.000Z',
    completedAt: '2026-09-13T12:14:00.000Z',
    completionReason: 'time-limited',
    isOffline: false,
    completedSetCount: 1,
    totalVolume: 0,
    totalDurationSeconds: 720,
    totalDistanceMeters: 2400,
  }),
];
