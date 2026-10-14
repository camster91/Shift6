export class ImmutableProgramVersionError extends Error {
  constructor() {
    super(
      'Saved program versions are immutable. Continue editing as a new private copy before saving changes.',
    );
    this.name = 'ImmutableProgramVersionError';
  }
}
/** Object key order is not a training change; array order and every JSON field are. */
export function stableSnapshotJSON(value: unknown): string {
  function sort(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(sort);
    if (value !== null && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, item]) => [key, sort(item)]),
      );
    return value;
  }
  return JSON.stringify(sort(JSON.parse(JSON.stringify(value))));
}
