import { createOnboardingDraft } from './onboarding';
import { coachSetupReview, nextCoachSetupQuestion } from './coachOnboarding';

test('never assumes missing choices or creates a measured baseline', () => {
  const draft = createOnboardingDraft();
  expect(nextCoachSetupQuestion(draft)).toBe(0);
  expect(coachSetupReview(draft).find((row) => row.question === 4)?.value).toContain('Not chosen');
  expect(draft.trainingDaysPerWeek).toBeNull();
  expect(Object.keys(draft)).not.toContain('baseline');
});

test('asks for missing equipment even if the existing profile completeness rule omits it', () => {
  const draft = {
    ...createOnboardingDraft('Sam'),
    goals: ['strength'] as ['strength'],
    experience: 'beginner' as const,
  };
  expect(nextCoachSetupQuestion(draft)).toBe(3);
  expect(draft.equipmentIds).toEqual([]);
});
