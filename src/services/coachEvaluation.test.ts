import { detectPlateau, evaluateReadiness } from '../domain/progression';
import { findExerciseSubstitutions } from '../domain/equipment';
import { foundationalExercises } from '../domain/fixtures/exercises';
import { demoCycle, demoUser } from '../domain/fixtures/home';
import type { CoachContext } from './contracts';
import { UnavailableCoachGateway } from './coach';
import { classifyCoachSafety } from './coachSafety';
import { buildLocalCoachMessage } from './localCoach';

const evaluationContext: CoachContext = {
  user: {
    id: demoUser.id,
    unitSystem: demoUser.unitSystem,
    goals: demoUser.goals,
    experience: demoUser.experience,
  },
  cycle: {
    id: demoCycle.id,
    programVersionId: demoCycle.programVersionId,
    currentWeek: 4,
    status: 'active',
  },
  structuredFacts: {
    workoutTitle: 'Strength A',
    workoutFocus: 'strength',
    estimatedDurationMinutes: 30,
    currentWeek: 4,
    completedWorkoutCount: 6,
    plannedWorkoutCount: 12,
    completionRate: 0.5,
    cardioMinutes: 45,
    personalRecordCount: 1,
  },
};

describe('Coach evaluation matrix', () => {
  it('fails closed when the provider is unavailable', async () => {
    const gateway = new UnavailableCoachGateway();

    await expect(gateway.generateMessage(evaluationContext, 'weekly-review')).resolves.toMatchObject({
      kind: 'unavailable',
    });
    await expect(gateway.generateProposal(evaluationContext, 'weekly-review')).rejects.toThrow(
      'No plan change was created',
    );
  });

  it('describes missed training from facts without punishing the user automatically', () => {
    const result = buildLocalCoachMessage(evaluationContext, 'weekly-review');

    expect(result.kind).toBe('message');
    expect(result.text).toContain('6 of 12');
    expect(result.text).toContain('50% adherence');
    expect(result.text).toContain('missed session is information');
  });

  it('requires comparable repeated attempts before calling a plateau', () => {
    const onePoorSession = detectPlateau([
      {
        id: 'session-1',
        planned: true,
        completed: true,
        targetAttempted: true,
        progressed: false,
      },
    ]);
    const repeatedPlateau = detectPlateau([
      {
        id: 'session-1',
        planned: true,
        completed: true,
        targetAttempted: true,
        progressed: false,
      },
      {
        id: 'session-2',
        planned: true,
        completed: true,
        targetAttempted: true,
        progressed: false,
      },
      {
        id: 'session-3',
        planned: true,
        completed: true,
        targetAttempted: true,
        progressed: false,
      },
    ]);

    expect(onePoorSession.status).toBe('insufficient-data');
    expect(repeatedPlateau.status).toBe('plateau');
  });

  it('stops ordinary progression when discomfort is reported', () => {
    expect(
      evaluateReadiness({
        energy: 4,
        soreness: 2,
        sleepQuality: 4,
        timeAvailableMinutes: 30,
        discomfort: true,
      }),
    ).toMatchObject({
      action: 'hold-progression',
    });

    expect(classifyCoachSafety('I have severe pain in my shoulder')).toMatchObject({
      route: 'professional-evaluation',
      shouldStopTraining: true,
    });
  });

  it('handles a limited-time request without mutating the plan', () => {
    const result = buildLocalCoachMessage(
      evaluationContext,
      'freeform',
      'I only have 15 minutes today. Can you make this quick?',
    );

    expect(result.kind).toBe('message');
    expect(result.text).toContain('If time is limited');
    expect(result.text).toContain('record what you skip');
    expect(result.text).toContain('ask for approval before changing future sessions');
  });

  it('uses equipment-aware substitution logic when equipment changes', () => {
    const backSquat = foundationalExercises.find(
      (exercise) => exercise.id === 'exercise-back-squat',
    );
    expect(backSquat).toBeDefined();
    if (!backSquat) return;

    const substitutions = findExerciseSubstitutions(backSquat, foundationalExercises, [
      'equipment-kettlebell',
    ]);

    expect(substitutions[0]?.id).toBe('exercise-goblet-squat');
    expect(buildLocalCoachMessage(evaluationContext, 'substitution').text).toContain(
      'equipment-compatible',
    );
  });

  it('routes unsafe medication and urgent-symptom requests before optimization', () => {
    expect(classifyCoachSafety('How much insulin should I take before this workout?')).toMatchObject({
      route: 'medication-boundary',
      shouldStopTraining: false,
    });
    expect(classifyCoachSafety('I have chest pain while training')).toMatchObject({
      route: 'urgent-care',
      shouldStopTraining: true,
    });
  });
});
