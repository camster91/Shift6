import type { ProgramVersion, WeeklyScheduleEntry, Workout } from './types';

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export function getDayOfWeek(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

export function getWorkoutForDay(
  programVersion: ProgramVersion,
  dayOfWeek: number,
): Workout | undefined {
  return programVersion.workouts
    .filter((workout) => workout.dayOfWeek === dayOfWeek)
    .sort((left, right) => Number(Boolean(left.isOptional)) - Number(Boolean(right.isOptional)))[0];
}

export function getTodayWorkout(programVersion: ProgramVersion, date: Date): Workout | undefined {
  return getWorkoutForDay(programVersion, getDayOfWeek(date));
}

export function buildWeeklySchedule(
  programVersion: ProgramVersion,
  completedWorkoutIds: ReadonlySet<string>,
  date: Date,
  fallback?: readonly WeeklyScheduleEntry[],
): WeeklyScheduleEntry[] {
  const today = getDayOfWeek(date);

  return dayLabels.map((day, index) => {
    const dayOfWeek = index + 1;
    const workout = getWorkoutForDay(programVersion, dayOfWeek);
    const fallbackEntry = fallback?.[index];

    if (!workout) {
      return {
        id: fallbackEntry?.id ?? `schedule-day-${dayOfWeek}`,
        day,
        title: fallbackEntry?.title ?? 'Rest',
        category: fallbackEntry?.category ?? 'rest',
        status: 'rest',
      };
    }

    return {
      id: `schedule-${programVersion.id}-${dayOfWeek}`,
      day,
      title: workout.title,
      workoutId: workout.id,
      category:
        workout.focus === 'cardio'
          ? 'cardio'
          : workout.focus === 'recovery'
            ? 'recovery'
            : 'strength',
      status: completedWorkoutIds.has(workout.id)
        ? 'complete'
        : dayOfWeek === today
          ? 'current'
          : 'upcoming',
    };
  });
}
