import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SQLiteDatabase } from 'expo-sqlite';
import { MIGRATIONS } from './migrations';
import { restoreLocalBackup } from './localRestoreRepository';
import { exportLocalUserData } from './privacyRepository';
import { validateLocalBackup } from '../domain/localRestore';
jest.mock('../config/env', () => ({ runtimeConfig: { releaseMode: 'guest-only' } }));

test('a concurrent committed pause cannot mix old history with new cycle status in an export', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'shift6-export-snapshot-'));
  const path = join(directory, 'db.sqlite');
  const reader = new DatabaseSync(path);
  reader.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
  for (const migration of MIGRATIONS)
    for (const statement of migration.statements) reader.exec(statement);
  const writer = new DatabaseSync(path);
  writer.exec('PRAGMA foreign_keys=ON;');
  let interleave = false;
  let committed = false;
  const stamp = '2026-10-13T04:00:00.000Z';
  const fixture = readFileSync(
    join(__dirname, '../../tests/fixtures/restore-schema12-synthetic.json'),
    'utf8',
  );
  const cycleId = JSON.parse(fixture).trainingCycles[0].id;
  const pause = () => {
    writer.exec('BEGIN');
    writer
      .prepare('INSERT INTO cycle_lifecycle_events VALUES (?,?,?,?,?,?,?,?,?)')
      .run(
        'pause',
        'guest-user',
        cycleId,
        'pause',
        '2026-10-13',
        'UTC',
        'resume',
        'pause-op',
        stamp,
      );
    writer.prepare("UPDATE training_cycles SET status='paused' WHERE id=?").run(cycleId);
    writer.exec('COMMIT');
    committed = true;
  };
  const db = {
    execAsync: async (sql: string) => reader.exec(sql),
    runAsync: async (sql: string, ...args: SQLInputValue[]) => {
      const result = reader.prepare(sql).run(...args);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    getFirstAsync: async (sql: string, ...args: SQLInputValue[]) =>
      reader.prepare(sql).get(...args) ?? null,
    getAllAsync: async (sql: string, ...args: SQLInputValue[]) => {
      const rows = reader.prepare(sql).all(...args);
      if (interleave && sql.includes('FROM cycle_lifecycle_events')) {
        interleave = false;
        pause();
      }
      return rows;
    },
    withExclusiveTransactionAsync: async (fn: (tx: SQLiteDatabase) => Promise<void>) => {
      reader.exec('BEGIN');
      try {
        await fn(db);
        reader.exec('COMMIT');
      } catch (error) {
        reader.exec('ROLLBACK');
        throw error;
      }
    },
  } as unknown as SQLiteDatabase;
  try {
    await restoreLocalBackup(db, 'guest-user', fixture);
    reader
      .prepare('INSERT INTO cycle_lifecycle_events VALUES (?,?,?,?,?,?,?,?,?)')
      .run(
        'resume',
        'guest-user',
        cycleId,
        'resume',
        '2026-10-13',
        'UTC',
        null,
        'resume-op',
        stamp,
      );
    interleave = true;
    const exported = await exportLocalUserData(db, 'guest-user', stamp);
    expect(committed).toBe(true);
    expect(exported.cycleLifecycleEvents).toHaveLength(1);
    expect(exported.trainingCycles[0]!.status).toBe('active');
    expect(() => validateLocalBackup(JSON.stringify(exported))).not.toThrow();
    expect(writer.prepare('SELECT status FROM training_cycles WHERE id=?').get(cycleId)).toEqual({
      status: 'paused',
    });
    const mixed = {
      ...exported,
      trainingCycles: [{ ...exported.trainingCycles[0], status: 'paused' }],
    };
    expect(() => validateLocalBackup(JSON.stringify(mixed))).toThrow('current cycle status');
    const next = await exportLocalUserData(db, 'guest-user', stamp);
    expect(next.cycleLifecycleEvents).toHaveLength(2);
    expect(() => validateLocalBackup(JSON.stringify(next))).not.toThrow();
  } finally {
    writer.close();
    reader.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
