/**
 * Each local change is an immutable operation. Entity IDs identify records;
 * mutation IDs and retry keys identify this particular snapshot of the record.
 * SQLite generates identities inside the caller's transaction, without a
 * dependency on a platform random API. Retries read the same persisted keys.
 */
export const SYNC_MUTATION_INSERT_SQL = `INSERT INTO sync_outbox
  (id, idempotency_key, entity_type, entity_id, payload_json, created_at)
  VALUES (? || ':' || lower(hex(randomblob(16))),
          ? || ':' || lower(hex(randomblob(16))), ?, ?, ?, ?);`;
