import type { CoachContext, CoachMessageResult, CoachTask } from './contracts';
import { classifyCoachSafety } from './coachSafety';

/**
 * A small offline explainer for the guest shell. It is intentionally not an
 * AI provider: it can only speak from the structured facts supplied by the
 * caller, and it cannot create or mutate a plan.
 */
export function buildLocalCoachMessage(
  context: CoachContext,
  task: CoachTask,
  prompt = '',
): CoachMessageResult {
  const safety = classifyCoachSafety(prompt);
  if (safety.route !== 'standard') {
    return {
      kind: 'safety-route',
      text: safety.response,
      factsUsed: ['deterministic safety classifier'],
    };
  }

  const facts = context.structuredFacts;
  const workoutTitle = stringFact(facts, 'workoutTitle', 'your next workout');
  const focus = stringFact(facts, 'workoutFocus', 'training');
  const duration = numberFact(facts, 'estimatedDurationMinutes');
  const week = numberFact(facts, 'currentWeek', context.cycle.currentWeek);
  const completed = numberFact(facts, 'completedWorkoutCount', 0);
  const planned = numberFact(facts, 'plannedWorkoutCount', 0);
  const adherence = numberFact(facts, 'completionRate', planned > 0 ? completed / planned : 0);
  const cardioMinutes = numberFact(facts, 'cardioMinutes', 0);
  const records = numberFact(facts, 'personalRecordCount', 0);

  switch (task) {
    case 'explain-workout':
      return message(
        `Week ${week}: ${workoutTitle} is a ${focus} session${duration ? ` planned for about ${duration} minutes` : ''}. Start with the targets shown, keep the effort repeatable, and log what actually happened so the next session can be calculated from real sets.`,
        ['current cycle week', 'active workout snapshot', 'session duration'],
      );
    case 'weekly-review':
      return message(
        `${completed} of ${planned || 'the planned'} workouts are recorded in this cycle (${formatPercent(adherence)} adherence). Keep the next decision tied to what was completed; a missed session is information, not a reason for automatic punishment.`,
        ['completed workout count', 'planned workout count', 'completion rate'],
      );
    case 'cycle-review':
      return message(
        `The local record currently shows ${completed} completed workouts, ${Math.round(cardioMinutes)} cardio minutes, and ${records} personal record${records === 1 ? '' : 's'}. Use those facts to choose whether to repeat, adjust, or change the next six-week block.`,
        ['completed workout count', 'cardio minutes', 'personal record count'],
      );
    case 'shorten-workout':
      return message(
        `If time is limited, keep the first required movement in ${workoutTitle}, use the prescribed targets, and record what you skip. SHIFT6 should preserve the plan boundary and ask for approval before changing future sessions.`,
        ['active workout snapshot', 'required-workout order'],
      );
    case 'substitution':
      return message(
        `Use the movement's substitution options to find an equipment-compatible choice with a similar pattern. The selected replacement applies to the private plan snapshot; completed history stays attached to the original movement.`,
        ['exercise movement pattern', 'saved equipment profile', 'private program snapshot'],
      );
    case 'freeform':
      return message(
        'The offline Coach can explain the current workout and local progress. Provider-backed answers and plan proposals will only use approved structured context and will always require your confirmation.',
        ['active cycle snapshot', 'local progress facts'],
      );
  }
}

function message(text: string, factsUsed: string[]): CoachMessageResult {
  return { kind: 'message', text, factsUsed };
}

function stringFact(facts: Record<string, unknown>, key: string, fallback: string): string {
  const value = facts[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function numberFact(facts: Record<string, unknown>, key: string, fallback = 0): number {
  const value = facts[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function formatPercent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}
