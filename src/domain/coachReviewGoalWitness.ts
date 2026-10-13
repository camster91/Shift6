import type { Shift, ShiftObservation } from './shift';
import { stableSnapshotJSON } from './programPersistence';

export type CoachReviewGoalWitness =
  | { state: 'event-history'; goalId: string; eventIds: string[] }
  | { state: 'unavailable-legacy-history'; goalId: string }
  | null;
export interface ReviewGoalEvent {
  id: string;
  shift_id: string;
  user_id: string;
  kind: string;
  payload_json: string;
  recorded_at: string;
}
export interface ReviewTargetRevision {
  id: string;
  shift_id: string;
  user_id: string;
  protocol_id: string;
  protocol_version: number;
  target_json: string;
  block_objective: string;
  reason: string;
  recorded_at: string;
}
function same(a: unknown, b: unknown) {
  return stableSnapshotJSON(a) === stableSnapshotJSON(b);
}
/** Replay only existing canonical user events, not an alternative goal authority. */
export function corroborateReviewGoal(
  goal: Shift,
  events: readonly ReviewGoalEvent[],
  revisions: readonly ReviewTargetRevision[],
  at: string,
  witness?: CoachReviewGoalWitness,
  observations?: readonly ShiftObservation[],
): CoachReviewGoalWitness {
  const owned = events.filter(
    (event) => event.shift_id === goal.id && event.user_id === goal.userId,
  );
  const ownedRevisions = revisions.filter(
    (row) => row.shift_id === goal.id && row.user_id === goal.userId,
  );
  if (owned.length > 1000 || ownedRevisions.length > 1000)
    throw new Error('Goal review evidence exceeds its bound.');
  const creation = owned.find((event) => event.kind === 'created');
  if (!creation) {
    if (witness && (witness.state !== 'unavailable-legacy-history' || witness.goalId !== goal.id))
      throw new Error('Goal review creation evidence is unavailable.');
    return { state: 'unavailable-legacy-history', goalId: goal.id };
  }
  if (owned[0]?.id !== creation.id || creation.recorded_at > at)
    throw new Error('Goal review creation order is invalid.');
  let selected = owned;
  if (witness !== undefined) {
    if (
      !witness ||
      witness.state !== 'event-history' ||
      witness.goalId !== goal.id ||
      !witness.eventIds.length
    )
      throw new Error('Goal review event witness is unavailable.');
    selected = owned.slice(0, witness.eventIds.length);
    if (
      !same(
        selected.map((event) => event.id),
        witness.eventIds,
      ) ||
      owned.slice(selected.length).some((event) => event.recorded_at < at)
    )
      throw new Error('Goal review event witness is not the dated canonical prefix.');
  }
  let objective: unknown, protocol: unknown, target: unknown;
  let baseline: Shift['baseline'] = { state: 'deferred' };
  let reviewState: unknown = 'missing',
    nextChoice: unknown = 'undecided';
  const measured: ShiftObservation[] = [];
  for (const [index, event] of selected.entries()) {
    if (event.recorded_at > at) throw new Error('Goal review event follows revalidation time.');
    const payload = JSON.parse(event.payload_json);
    switch (event.kind) {
      case 'created':
        if (index !== 0 || payload.cycleId !== goal.cycleId)
          throw new Error('Goal review creation changed.');
        objective = payload.objective;
        protocol = payload.protocol;
        target = payload.target;
        break;
      case 'measurement':
        if (payload.observation.measuredAt <= at) measured.push(payload.observation);
        if (payload.baseline === true)
          baseline = { state: 'measured', observationId: payload.observation.id };
        break;
      case 'baseline-state':
        baseline = { state: payload.state };
        break;
      case 'target-revision': {
        const revision = ownedRevisions.find((row) => row.id === event.id);
        if (
          !revision ||
          !same(JSON.parse(revision.target_json), payload.target) ||
          revision.reason !== payload.reason ||
          revision.block_objective !== objective ||
          revision.recorded_at !== event.recorded_at ||
          revision.protocol_id !== goal.protocol.id ||
          revision.protocol_version !== goal.protocol.version
        )
          throw new Error('Goal review target revision source is unavailable.');
        target = payload.target;
        break;
      }
      case 'review':
        if (
          !same(payload.target, target) ||
          !same(payload.baseline, baseline) ||
          !same(payload.protocol, protocol)
        )
          throw new Error('Goal review event disagrees with its dated source state.');
        reviewState = payload.state;
        nextChoice = payload.choice;
        break;
      default:
        throw new Error('Unknown goal review source event.');
    }
  }
  if (
    goal.templateId !== 'personal-entry-v1' ||
    goal.longerTermAspiration !== undefined ||
    !same(
      { objective, protocol, target, baseline, reviewState, nextChoice },
      {
        objective: goal.blockObjective,
        protocol: goal.protocol,
        target: goal.target,
        baseline: goal.baseline,
        reviewState: goal.reviewState,
        nextChoice: goal.nextChoice,
      },
    )
  )
    throw new Error('Goal review witness disagrees with canonical dated goal events.');
  if (
    observations &&
    !same(
      [...observations].sort((a, b) => a.id.localeCompare(b.id)),
      measured.sort((a, b) => a.id.localeCompare(b.id)),
    )
  )
    throw new Error('Goal review measurements disagree with the witnessed canonical series.');
  return { state: 'event-history', goalId: goal.id, eventIds: selected.map((event) => event.id) };
}
