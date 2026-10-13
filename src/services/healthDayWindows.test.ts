import { utcHealthWindows, utcHealthReplacementRange } from './healthDayWindows';
test('uses UTC day boundaries over DST while retaining the exact requested range', () => {
  const range = { startAt: '2026-11-01T00:00:00-04:00', endAt: '2026-11-02T00:00:00-05:00' };
  expect(utcHealthWindows(range)).toEqual([
    { startAt: '2026-11-01T04:00:00.000Z', endAt: '2026-11-02T00:00:00.000Z' },
    { startAt: '2026-11-02T00:00:00.000Z', endAt: '2026-11-02T05:00:00.000Z' },
  ]);
  expect(utcHealthReplacementRange(range)).toEqual({
    startAt: '2026-11-01T00:00:00.000Z',
    endAt: '2026-11-03T00:00:00.000Z',
  });
});
test('a midnight end does not produce a spurious next day or zero window', () => {
  expect(
    utcHealthWindows({ startAt: '2026-10-12T00:00:00Z', endAt: '2026-10-13T00:00:00Z' }),
  ).toHaveLength(1);
});
test('invalid and unbounded ranges cannot start aggregate reads', () => {
  expect(() => utcHealthWindows({ startAt: 'bad', endAt: '2026-10-13T00:00:00Z' })).toThrow();
  expect(() => utcHealthWindows({ startAt: '2020-01-01', endAt: '2026-01-01' })).toThrow(
    'too large',
  );
});
