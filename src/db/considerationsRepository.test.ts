import type { SQLiteDatabase } from 'expo-sqlite';

import { getUserConsiderations, saveUserConsiderations } from './considerationsRepository';

describe('user considerations repository', () => {
  it('normalizes and saves structured local-only considerations', async () => {
    const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 1 }));
    const database = { runAsync } as unknown as SQLiteDatabase;

    await expect(
      saveUserConsiderations(database, {
        userId: ' guest-user ',
        movementConsiderations: ['avoid-impact', 'avoid-impact', 'avoid-overhead'],
        accessibilityNeeds: ['larger-text', 'screen-reader', 'screen-reader'],
        updatedAt: '2026-09-16T10:00:00.000Z',
      }),
    ).resolves.toEqual({
      userId: 'guest-user',
      movementConsiderations: ['avoid-impact', 'avoid-overhead'],
      accessibilityNeeds: ['larger-text', 'screen-reader'],
      updatedAt: '2026-09-16T10:00:00.000Z',
    });

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_considerations'),
      'guest-user',
      JSON.stringify(['avoid-impact', 'avoid-overhead']),
      JSON.stringify(['larger-text', 'screen-reader']),
      '2026-09-16T10:00:00.000Z',
    );
  });

  it('fails closed on malformed stored JSON and unknown values', async () => {
    const database = {
      getFirstAsync: async () => ({
        user_id: 'guest-user',
        movement_considerations_json: JSON.stringify(['avoid-impact', 'unknown']),
        accessibility_needs_json: '{bad json',
        updated_at: '2026-09-16T10:00:00.000Z',
      }),
    } as unknown as SQLiteDatabase;

    await expect(getUserConsiderations(database, 'guest-user')).resolves.toEqual({
      userId: 'guest-user',
      movementConsiderations: ['avoid-impact'],
      accessibilityNeeds: [],
      updatedAt: '2026-09-16T10:00:00.000Z',
    });
  });
});
