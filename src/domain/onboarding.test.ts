import { demoEquipment, demoProgram } from './fixtures/home';
import {
  createOnboardingDraft,
  isOnboardingComplete,
  recommendPrograms,
  toOnboardingProfile,
} from './onboarding';

describe('onboarding domain', () => {
  const completeDraft = {
    ...createOnboardingDraft('Cameron'),
    goals: ['strength' as const],
    experience: 'intermediate' as const,
    equipmentIds: demoEquipment.map((equipment) => equipment.id),
    trainingDaysPerWeek: 3,
    preferredSessionMinutes: 30,
    preferredTrainingTime: 'morning' as const,
    unitSystem: 'imperial' as const,
    coachTone: 'supportive' as const,
    coachIntervention: 'balanced' as const,
    healthConnection: 'not-now' as const,
  };

  it('requires all non-health onboarding choices before completing', () => {
    expect(isOnboardingComplete(createOnboardingDraft())).toBe(false);
    expect(isOnboardingComplete(completeDraft)).toBe(true);
  });

  it('maps a complete draft to a stable guest profile', () => {
    const profile = toOnboardingProfile(completeDraft, '2026-09-13T12:00:00.000Z');

    expect(profile.user.id).toBe('guest-user');
    expect(profile.user.displayName).toBe('Cameron');
    expect(profile.coachIntervention).toBe('balanced');
    expect(profile.healthConnection).toBe('not-now');
    expect(profile.user.preferredTrainingTime).toBe('morning');
    expect(profile.completedAt).toBe(profile.user.updatedAt);
  });

  it('ranks a compatible Barbell 30 recommendation and explains the fit', () => {
    const [recommendation] = recommendPrograms([demoProgram], {
      goals: ['strength'],
      experience: 'intermediate',
      equipmentIds: demoEquipment.map((equipment) => equipment.id),
      trainingDaysPerWeek: 3,
      preferredSessionMinutes: 30,
    });

    expect(recommendation?.program.id).toBe(demoProgram.id);
    expect(recommendation?.compatible).toBe(true);
    expect(recommendation?.missingRequiredEquipmentIds).toEqual([]);
    expect(recommendation?.reasons).toEqual(
      expect.arrayContaining(['Matches your strength goal.', 'Uses equipment you have available.']),
    );
  });

  it('keeps incompatible programs visible and names missing equipment', () => {
    const [recommendation] = recommendPrograms([demoProgram], {
      goals: ['strength'],
      experience: 'beginner',
      equipmentIds: ['equipment-dumbbells'],
      trainingDaysPerWeek: 3,
      preferredSessionMinutes: 30,
    });

    expect(recommendation?.compatible).toBe(false);
    expect(recommendation?.missingRequiredEquipmentIds).toEqual([
      'equipment-barbell',
      'equipment-plates',
      'equipment-rack',
    ]);
    expect(recommendation?.reasons.at(-1)).toBe('Needs 3 more required equipment items.');
  });
});
