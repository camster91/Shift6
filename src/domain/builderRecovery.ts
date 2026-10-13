import type { BuilderRecoverySnapshot } from './localPersistence';
import { foundationalExercises } from './fixtures/exercises';
export function assertPrivateRecoveryMovementIds(snapshot: BuilderRecoverySnapshot): void {
  const reserved = new Set(foundationalExercises.map((exercise) => exercise.id));
  if (snapshot.customExercises.some((exercise) => reserved.has(exercise.id)))
    throw new Error('Private recovery cannot replace a catalogue movement ID.');
}
export type PlanImportRecovery = BuilderRecoverySnapshot['imports'][number];
export function builderRouteKey(mode?: string, sourceVersionId?: string): string {
  return JSON.stringify([mode ?? 'copy', sourceVersionId ?? null]);
}
export function builderRecoveryId(owner: string, route: string): string {
  return `builder-recovery:${JSON.stringify([owner, route])}`;
}
// Owner adoption/backup restore may keep historical IDs. The SQL owner scope,
// snapshot validation and route suffix remain authoritative, not that ID's owner.
export function builderRecoveryRoute(id: string): string | null {
  if (!id.startsWith('builder-recovery:')) return null;
  try {
    const value: unknown = JSON.parse(id.slice('builder-recovery:'.length));
    return Array.isArray(value) &&
      value.length === 2 &&
      typeof value[0] === 'string' &&
      typeof value[1] === 'string'
      ? value[1]
      : null;
  } catch {
    return null;
  }
}
