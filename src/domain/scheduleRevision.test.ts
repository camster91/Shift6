import { buildCycleSchedule, parseDateKey } from './calendar';
import { demoCycle, demoProgramVersion } from './fixtures/home';
import {
  appendScheduleRevision,
  projectScheduleRevisions,
  type ScheduleMove,
  type ScheduleRevisionContext,
} from './scheduleRevision';

const now = '2026-09-13T16:00:00.000Z';
function context(): ScheduleRevisionContext {
  const cycle = { ...demoCycle, currentWeek: 1, status: 'active' as const };
  return {
    cycle,
    programVersion: demoProgramVersion,
    baseline: buildCycleSchedule(cycle, demoProgramVersion, [], [], parseDateKey('2026-09-13')),
    sessions: [],
  };
}
function move(ctx = context(), patch: Partial<ScheduleMove> = {}): ScheduleMove {
  const occurrence = ctx.baseline.find((item) => item.cycleWeek === 1)!;
  return {
    operationId: 'move-1',
    userId: ctx.cycle.userId,
    cycleId: ctx.cycle.id,
    programVersionId: ctx.cycle.programVersionId,
    cycleWeek: 1,
    workoutId: occurrence.workout.id,
    previousRevisionId: null,
    fromDate: occurrence.scheduledDate,
    toDate: '2026-09-17',
    timeZone: 'America/Toronto',
    ...patch,
  };
}

describe('append-only schedule revisions', () => {
  it('moves one occurrence without changing sessions, workouts, dose, cycle progress or baseline', () => {
    const ctx = context();
    const original = JSON.stringify(ctx);
    const intent = move(ctx);
    const result = appendScheduleRevision(ctx, [], intent, now);
    const projection = projectScheduleRevisions(ctx, result.revisions);
    expect(result.status).toBe('appended');
    expect(result.revisions[0]).toMatchObject({ effectiveDate: '2026-09-13', recordedAt: now });
    expect(
      projection.filter((item, i) => item.scheduledDate !== ctx.baseline[i]!.scheduledDate),
    ).toHaveLength(1);
    expect(
      projection.find((item) => item.cycleWeek === 1 && item.workout.id === intent.workoutId),
    ).toMatchObject({ scheduledDate: intent.toDate, isMoved: true });
    expect(JSON.stringify(ctx)).toBe(original);
    expect(projection.map((item) => item.workout)).toEqual(
      ctx.baseline.map((item) => item.workout),
    );
  });

  it('retries exactly once, including after progress, while rejecting a reused identity', () => {
    const ctx = context();
    const intent = move(ctx);
    const first = appendScheduleRevision(ctx, [], intent, now);
    ctx.cycle = { ...ctx.cycle, currentWeek: 2, status: 'paused' };
    expect(
      appendScheduleRevision(ctx, first.revisions, intent, '2026-09-20T16:00:00.000Z'),
    ).toEqual({ status: 'already-applied', revisions: first.revisions });
    expect(() =>
      appendScheduleRevision(ctx, first.revisions, { ...intent, toDate: '2026-09-18' }, now),
    ).toThrow('identity');
  });

  it('requires both latest revision and preceding scheduled date for subsequent moves', () => {
    const ctx = context();
    const first = appendScheduleRevision(ctx, [], move(ctx), now);
    expect(() =>
      appendScheduleRevision(ctx, first.revisions, move(ctx, { operationId: 'move-2' }), now),
    ).toThrow('latest');
    expect(() =>
      appendScheduleRevision(
        ctx,
        first.revisions,
        move(ctx, { operationId: 'move-2', previousRevisionId: 'move-1' }),
        now,
      ),
    ).toThrow('date changed');
    const second = appendScheduleRevision(
      ctx,
      first.revisions,
      move(ctx, {
        operationId: 'move-2',
        previousRevisionId: 'move-1',
        fromDate: '2026-09-17',
        toDate: '2026-09-18',
      }),
      now,
    );
    expect(second.revisions).toHaveLength(2);
    expect(first.revisions).toHaveLength(1);
  });

  it.each(['complete', 'partial', 'skipped', 'in-progress'] as const)(
    'locks %s recorded history even if baseline status is stale',
    (status) => {
      const ctx = context();
      const intent = move(ctx);
      ctx.sessions = [
        {
          cycleId: intent.cycleId,
          cycleWeek: 1,
          workoutId: intent.workoutId,
          programVersionId: intent.programVersionId,
          status,
        },
      ];
      expect(() => appendScheduleRevision(ctx, [], intent, now)).toThrow('history cannot be moved');
    },
  );

  it('locks a terminal projection even when its session rows are missing', () => {
    const ctx = context();
    ctx.baseline = ctx.baseline.map((item, i) => (i === 0 ? { ...item, status: 'partial' } : item));
    expect(() => appendScheduleRevision(ctx, [], move(ctx), now)).toThrow('history');
  });

  it('replays an accepted move after completion without changing the recorded session', () => {
    const ctx = context();
    const intent = move(ctx);
    const revisions = appendScheduleRevision(ctx, [], intent, now).revisions;
    ctx.sessions = [
      {
        cycleId: intent.cycleId,
        cycleWeek: 1,
        workoutId: intent.workoutId,
        programVersionId: intent.programVersionId,
        status: 'complete',
      },
    ];
    ctx.baseline = ctx.baseline.map((item) =>
      item.cycleWeek === 1 && item.workout.id === intent.workoutId
        ? { ...item, status: 'complete' }
        : item,
    );
    const before = JSON.stringify(ctx.sessions);
    expect(projectScheduleRevisions(ctx, revisions)[0]).toMatchObject({
      scheduledDate: '2026-09-17',
      status: 'complete',
    });
    expect(JSON.stringify(ctx.sessions)).toBe(before);
    expect(() =>
      appendScheduleRevision(
        ctx,
        revisions,
        move(ctx, {
          operationId: 'move-2',
          previousRevisionId: 'move-1',
          fromDate: '2026-09-17',
          toDate: '2026-09-18',
        }),
        now,
      ),
    ).toThrow('history');
  });

  it.each([
    { userId: 'other' },
    { cycleId: 'other' },
    { programVersionId: 'other' },
    { workoutId: 'other' },
    { cycleWeek: 7 },
  ])('rejects foreign or invalid bindings %j', (patch) => {
    expect(() => appendScheduleRevision(context(), [], move(context(), patch), now)).toThrow(
      'belong',
    );
  });

  it('does not treat a reschedule as repeating a completed week or create an attempt', () => {
    const ctx = context();
    ctx.cycle = { ...ctx.cycle, currentWeek: 2 };
    expect(() => appendScheduleRevision(ctx, [], move(ctx), now)).toThrow('current week');
    ctx.cycle = { ...ctx.cycle, currentWeek: 1, status: 'complete' };
    expect(() => appendScheduleRevision(ctx, [], move(ctx), now)).toThrow('active');
    ctx.cycle = {
      ...ctx.cycle,
      status: 'active',
      weeks: ctx.cycle.weeks.map((week) =>
        week.weekNumber === 1 ? { ...week, status: 'completed' } : week,
      ),
    };
    expect(() => appendScheduleRevision(ctx, [], move(ctx), now)).toThrow('distinct attempt');
  });

  it.each(['2026-02-30', '2026-9-17', 'yesterday'])(
    'rejects malformed explicit date %s',
    (toDate) => {
      expect(() =>
        appendScheduleRevision(context(), [], move(context(), { toDate }), now),
      ).toThrow();
    },
  );

  it('requires a real explicit zone and date; never falls back to device zone', () => {
    for (const timeZone of ['', undefined, 'Mars/Olympus'])
      expect(() =>
        appendScheduleRevision(
          context(),
          [],
          move(context(), { timeZone: timeZone as string }),
          now,
        ),
      ).toThrow();
    expect(() =>
      appendScheduleRevision(context(), [], move(context(), { toDate: '2026-09-12' }), now),
    ).toThrow('future');
  });

  it.each(['2026-03-08T06:30:00.000Z', '2026-11-01T05:30:00.000Z'])(
    'records explicit date across Toronto DST at %s',
    (instant) => {
      const ctx = context();
      ctx.cycle = {
        ...ctx.cycle,
        startedAt: instant.startsWith('2026-03')
          ? '2026-03-07T12:00:00.000Z'
          : '2026-10-31T12:00:00.000Z',
      };
      ctx.baseline = buildCycleSchedule(
        ctx.cycle,
        ctx.programVersion,
        [],
        [],
        parseDateKey(instant.slice(0, 10)),
      );
      const date = instant.slice(0, 10);
      const revisions = appendScheduleRevision(
        ctx,
        [],
        move(ctx, { toDate: date }),
        instant,
      ).revisions;
      expect(revisions[0]!.effectiveDate).toBe(date);
      expect(projectScheduleRevisions(ctx, revisions)[0]!.scheduledDate).toBe(date);
    },
  );

  it('travel changes only the explicitly selected date and zone; other baseline dates stay pinned', () => {
    const ctx = context();
    const instant = '2026-09-14T01:00:00.000Z';
    ctx.baseline = ctx.baseline.map((item, index) =>
      index === 0 ? { ...item, scheduledDate: '2026-09-14', isMoved: true } : item,
    );
    const west = appendScheduleRevision(
      ctx,
      [],
      move(ctx, { timeZone: 'America/Los_Angeles', toDate: '2026-09-13' }),
      instant,
    );
    expect(west.revisions[0]!.effectiveDate).toBe('2026-09-13');
    expect(() =>
      appendScheduleRevision(
        ctx,
        [],
        move(ctx, { timeZone: 'Asia/Tokyo', toDate: '2026-09-13' }),
        instant,
      ),
    ).toThrow('future');
    expect(projectScheduleRevisions(ctx, west.revisions).slice(1)).toEqual(ctx.baseline.slice(1));
  });

  it('rejects disconnected, duplicated, reversed, date-divergent and time-divergent history', () => {
    const ctx = context();
    const revision = appendScheduleRevision(ctx, [], move(ctx), now).revisions[0]!;
    for (const patch of [
      { previousRevisionId: 'missing' },
      { fromDate: '2026-09-30' },
      { effectiveDate: '2026-09-14' },
      { recordedAt: 'bad' },
      { toDate: '2026-09-12' },
    ])
      expect(() => projectScheduleRevisions(ctx, [{ ...revision, ...patch }])).toThrow();
    expect(() => projectScheduleRevisions(ctx, [revision, revision])).toThrow();
    const second = appendScheduleRevision(
      ctx,
      [revision],
      move(ctx, {
        operationId: 'move-2',
        previousRevisionId: revision.operationId,
        fromDate: revision.toDate,
        toDate: '2026-09-18',
      }),
      '2026-09-13T17:00:00.000Z',
    ).revisions[1]!;
    expect(() => projectScheduleRevisions(ctx, [second, revision])).toThrow();
    expect(() =>
      projectScheduleRevisions(ctx, [
        revision,
        { ...second, recordedAt: '2026-09-13T15:00:00.000Z' },
      ]),
    ).toThrow();
    expect(() =>
      appendScheduleRevision(
        ctx,
        [revision],
        move(ctx, {
          operationId: 'move-2',
          previousRevisionId: revision.operationId,
          fromDate: revision.toDate,
          toDate: '2026-09-18',
        }),
        '2026-09-12T16:00:00.000Z',
      ),
    ).toThrow('precedes');
  });

  it('fails closed on incomplete, duplicate or foreign baseline and wrong immutable version', () => {
    const ctx = context();
    const first = ctx.baseline[0]!;
    for (const baseline of [
      ctx.baseline.slice(1),
      [...ctx.baseline, first],
      ctx.baseline.map((item, i) => (i === 0 ? { ...item, cycleId: 'other' } : item)),
    ])
      expect(() => projectScheduleRevisions({ ...ctx, baseline }, [])).toThrow();
    expect(() =>
      projectScheduleRevisions(
        { ...ctx, programVersion: { ...ctx.programVersion, id: 'other' } },
        [],
      ),
    ).toThrow('version');
  });
});
