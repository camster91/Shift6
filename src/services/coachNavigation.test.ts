import type { SQLiteDatabase } from 'expo-sqlite';
import { loadCoachNavigationSnapshot, resolveCoachNavigation } from './coachNavigation';
import { demoProgram, demoProgramVersion, demoUser } from '../domain/fixtures/home';
import { createTrainingCycle } from '../domain/cycle';
import { foundationalExercises } from '../domain/fixtures/exercises';
const mockProfile = jest.fn(),
  mockCycle = jest.fn(),
  mockVersion = jest.fn(),
  mockOverrides = jest.fn(),
  mockSessions = jest.fn(),
  mockExercises = jest.fn();
jest.mock('../db/profileRepository', () => ({
  getOnboardingProfile: (...args: unknown[]) => mockProfile(...args),
}));
jest.mock('../db/cycleRepository', () => ({
  getActiveTrainingCycle: (...args: unknown[]) => mockCycle(...args),
}));
jest.mock('../db/programRepository', () => ({
  getUserProgramVersion: (...args: unknown[]) => mockVersion(...args),
  getUserExercises: (...args: unknown[]) => mockExercises(...args),
}));
jest.mock('../db/calendarRepository', () => ({
  getWorkoutScheduleOverrides: (...args: unknown[]) => mockOverrides(...args),
  getWorkoutScheduleSessions: (...args: unknown[]) => mockSessions(...args),
}));
const db = { runAsync: jest.fn() } as unknown as SQLiteDatabase;
const now = new Date('2026-10-12T12:00:00.000Z');
const version = {
  ...demoProgramVersion,
  workouts: [{ ...demoProgramVersion.workouts[0]!, dayOfWeek: 1 }],
};
const cycle = createTrainingCycle({
  id: 'cycle',
  userId: 'owner',
  programVersion: version,
  startedAt: now.toISOString(),
});
beforeEach(() => {
  jest.clearAllMocks();
  mockProfile.mockResolvedValue({
    user: { ...demoUser, id: 'owner' },
    coachTone: 'supportive',
    coachIntervention: 'conservative',
    healthConnection: 'not-now',
    completedAt: now.toISOString(),
  });
  mockCycle.mockResolvedValue(cycle);
  mockVersion.mockResolvedValue({ program: demoProgram, version });
  mockOverrides.mockResolvedValue([]);
  mockSessions.mockResolvedValue([]);
  mockExercises.mockResolvedValue([]);
});
test.each([
  'https://example.org',
  'DELETE FROM user_profiles',
  { id: 'open-health-controls', url: 'https://example.org' },
  'delete-account',
])('rejects unknown action %p before even reading context', async (action) => {
  await expect(resolveCoachNavigation(db, 'owner', action, now)).rejects.toThrow('not available');
  expect(mockProfile).not.toHaveBeenCalled();
  expect(db.runAsync).not.toHaveBeenCalled();
});
test('workout navigation opens existing Home controls without starting or writing a session', async () => {
  expect(await resolveCoachNavigation(db, 'owner', 'open-workout-controls', now)).toEqual({
    owner: 'owner',
    status: 'ready-to-open',
    route: '/',
  });
  expect(db.runAsync).not.toHaveBeenCalled();
  expect(mockVersion).toHaveBeenCalledWith(db, 'owner', cycle.programVersionId);
});
test('fresh target has setup controls without fabricated training or provider activation', async () => {
  mockProfile.mockResolvedValue(null);
  mockCycle.mockResolvedValue(null);
  const state = await loadCoachNavigationSnapshot(db, 'owner', now);
  expect(state).toMatchObject({
    hasProfile: false,
    hasCycle: false,
    selection: null,
    cycle: null,
    snapshot: null,
  });
  expect((await resolveCoachNavigation(db, 'owner', 'open-setup', now)).route).toBe('/onboarding');
  await expect(resolveCoachNavigation(db, 'owner', 'open-goal', now)).rejects.toThrow(
    'Start a private cycle',
  );
  expect(db.runAsync).not.toHaveBeenCalled();
});
test('execution rechecks ownership, active prescription and current availability', async () => {
  await loadCoachNavigationSnapshot(db, 'owner', now);
  mockCycle.mockResolvedValue(null);
  await expect(resolveCoachNavigation(db, 'owner', 'open-workout-controls', now)).rejects.toThrow(
    'No scheduled',
  );
  mockCycle.mockResolvedValue({ ...cycle, userId: 'intruder' });
  await expect(resolveCoachNavigation(db, 'owner', 'open-calendar', now)).rejects.toThrow(
    'ownership',
  );
  expect(db.runAsync).not.toHaveBeenCalled();
});
test('foreign schedule and mismatched immutable snapshots fail closed', async () => {
  mockVersion.mockResolvedValue({ program: demoProgram, version: { ...version, id: 'different' } });
  await expect(loadCoachNavigationSnapshot(db, 'owner', now)).rejects.toThrow('snapshot');
  mockVersion.mockResolvedValue({ program: demoProgram, version });
  mockOverrides.mockResolvedValue([{ userId: 'intruder', cycleId: 'cycle' }]);
  await expect(loadCoachNavigationSnapshot(db, 'owner', now)).rejects.toThrow('ownership');
});
test('public guidance remains review gated and owned custom guidance uses a typed local route', async () => {
  await expect(resolveCoachNavigation(db, 'owner', 'open-guidance', now)).rejects.toThrow(
    'reviewed movement',
  );
  const movementId = version.workouts[0]!.exercises[0]!.exerciseId;
  mockExercises.mockResolvedValue([
    { ...foundationalExercises[0]!, id: movementId, isCustom: true, contentStatus: 'draft' },
  ]);
  expect((await resolveCoachNavigation(db, 'owner', 'open-guidance', now)).route).toEqual({
    pathname: '/exercise/[id]',
    params: { id: movementId },
  });
  expect(db.runAsync).not.toHaveBeenCalled();
});
