import type { Equipment, Exercise } from './types';

export const equipmentCatalog: readonly Equipment[] = [
  equipment('equipment-barbell', 'Barbell', 'free-weight', ['bar']),
  equipment('equipment-plates', 'Plates', 'free-weight', ['weight plates']),
  equipment('equipment-rack', 'Rack', 'free-weight', ['squat rack', 'power rack']),
  equipment('equipment-bench', 'Bench', 'free-weight', ['flat bench']),
  equipment('equipment-dumbbells', 'Dumbbells', 'free-weight', ['dumbbell']),
  equipment('equipment-adjustable-dumbbells', 'Adjustable dumbbells', 'free-weight', [
    'adjustable dumbbell',
  ]),
  equipment('equipment-cable-machine', 'Cable machine', 'machine', ['cable station']),
  equipment('equipment-dual-pulley', 'Dual pulley', 'machine', ['functional trainer']),
  equipment('equipment-resistance-bands', 'Resistance bands', 'accessory', [
    'bands',
    'resistance band',
  ]),
  equipment('equipment-pull-up-bar', 'Pull-up bar', 'bodyweight', ['chin-up bar']),
  equipment('equipment-kettlebell', 'Kettlebell', 'free-weight', ['kettle bell']),
  equipment('equipment-smith-machine', 'Smith machine', 'machine', ['smith rack']),
  equipment('equipment-selectorized-machine', 'Selectorized machine', 'machine', [
    'weight machine',
  ]),
  equipment('equipment-bike', 'Stationary bike', 'cardio', ['bike', 'spin bike']),
  equipment('equipment-treadmill', 'Treadmill', 'cardio', ['running machine']),
  equipment('equipment-rower', 'Rowing machine', 'cardio', ['row erg', 'erg']),
  equipment('equipment-bodyweight', 'Bodyweight', 'bodyweight', ['no equipment']),
  equipment('equipment-medicine-ball', 'Medicine ball', 'accessory', ['med ball']),
  equipment('equipment-suspension-trainer', 'Suspension trainer', 'accessory', ['TRX']),
  equipment('equipment-foam-roller', 'Foam roller', 'mobility', ['roller']),
  equipment('equipment-plyo-box', 'Plyometric box', 'accessory', ['box']),
  equipment('equipment-jump-rope', 'Jump rope', 'cardio', ['skipping rope']),
  equipment('equipment-battle-rope', 'Battle rope', 'cardio', ['ropes']),
];

export function missingEquipment(
  requiredEquipmentIds: readonly string[],
  availableEquipmentIds: readonly string[],
): string[] {
  const available = new Set(availableEquipmentIds);
  return requiredEquipmentIds.filter((id) => !available.has(id));
}

export function isExerciseCompatible(
  exercise: Pick<Exercise, 'equipmentIds'>,
  availableEquipmentIds: readonly string[],
): boolean {
  const available = new Set(availableEquipmentIds);
  return exercise.equipmentIds.every(
    (equipmentId) => equipmentId === 'equipment-bodyweight' || available.has(equipmentId),
  );
}

export function findExerciseSubstitutions(
  exercise: Exercise,
  candidates: readonly Exercise[],
  availableEquipmentIds: readonly string[],
  limit = 5,
): Exercise[] {
  return candidates
    .filter(
      (candidate) =>
        candidate.id !== exercise.id && isExerciseCompatible(candidate, availableEquipmentIds),
    )
    .map((candidate) => ({ candidate, score: substitutionScore(exercise, candidate) }))
    .sort(
      (left, right) =>
        right.score - left.score || left.candidate.name.localeCompare(right.candidate.name),
    )
    .slice(0, Math.max(0, limit))
    .map(({ candidate }) => candidate);
}

function substitutionScore(source: Exercise, candidate: Exercise): number {
  const sharedMuscles = candidate.primaryMuscles.filter((muscle) =>
    source.primaryMuscles.includes(muscle),
  ).length;
  const sharedTags = candidate.tags.filter((tag) => source.tags.includes(tag)).length;

  return (
    (candidate.movementPattern === source.movementPattern ? 100 : 0) +
    sharedMuscles * 10 +
    sharedTags * 3
  );
}

function equipment(
  id: string,
  name: string,
  category: Equipment['category'],
  aliases: string[],
): Equipment {
  return { id, name, category, aliases };
}
