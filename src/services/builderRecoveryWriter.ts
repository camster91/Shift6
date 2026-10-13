import type { SQLiteDatabase } from 'expo-sqlite';
import { clearBuilderRecovery, saveBuilderRecovery } from '../db/builderRecoveryRepository';
import { builderRecoveryId } from '../domain/builderRecovery';
import type { BuilderRecoveryDraft, BuilderRecoverySnapshot } from '../domain/localPersistence';
/** One route/owner writer. A CAS conflict stops it; it never retries by overwriting. */
export function createBuilderRecoveryWriter(
  database: SQLiteDatabase,
  owner: string,
  route: string,
  prior: BuilderRecoveryDraft | null,
) {
  let revision = prior?.revision ?? 0;
  const id = prior?.id ?? builderRecoveryId(owner, route);
  let latest = prior ? JSON.stringify(prior.snapshot) : null;
  let tail = Promise.resolve();
  let stopped = false;
  let failure: unknown = null;
  function serialized<T>(operation: () => Promise<T>): Promise<T> {
    const result = tail.then(async () => {
      if (failure) throw failure;
      return operation();
    });
    tail = result.then(
      () => undefined,
      (error) => {
        failure = error;
      },
    );
    return result;
  }
  return {
    stop() {
      stopped = true;
    },
    flush() {
      return tail.then(() => {
        if (failure) throw failure;
      });
    },
    save(snapshot: BuilderRecoverySnapshot) {
      const copy = JSON.parse(JSON.stringify(snapshot)) as BuilderRecoverySnapshot;
      return serialized(async () => {
        if (stopped) return false;
        const text = JSON.stringify(copy);
        if (text === latest) return true;
        const record = await saveBuilderRecovery(database, owner, route, copy, revision, id);
        revision = record.revision;
        latest = text;
        return true;
      });
    },
    clearIfMatches(snapshot: BuilderRecoverySnapshot) {
      const text = JSON.stringify(snapshot);
      return serialized(async () => {
        if (stopped || latest !== text || revision === 0) return false;
        await clearBuilderRecovery(database, owner, id, revision);
        revision = 0;
        latest = null;
        return true;
      });
    },
  };
}
