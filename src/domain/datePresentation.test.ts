import { formatRecordedDateTime } from './datePresentation';

test('recorded time uses the explicitly saved zone across UTC midnight', () => {
  const raw = '2026-10-14T00:30:00.000Z';
  expect(formatRecordedDateTime(raw, 'America/New_York', 'en-US')).toBe(
    'Oct 13, 2026, 8:30 PM EDT',
  );
  expect(formatRecordedDateTime(raw, 'Asia/Tokyo', 'en-US')).toBe('Oct 14, 2026, 9:30 AM GMT+9');
  expect(raw).toBe('2026-10-14T00:30:00.000Z');
});
test('the repeated DST hour retains its offset distinction', () => {
  expect(formatRecordedDateTime('2026-11-01T05:30:00.000Z', 'America/New_York', 'en-US')).toBe(
    'Nov 1, 2026, 1:30 AM EDT',
  );
  expect(formatRecordedDateTime('2026-11-01T06:30:00.000Z', 'America/New_York', 'en-US')).toBe(
    'Nov 1, 2026, 1:30 AM EST',
  );
});
test('locale changes presentation while the saved zone and instant stay the same', () => {
  expect(formatRecordedDateTime('2026-10-14T00:30:00.000Z', 'America/New_York', 'fr-CA')).toMatch(
    /13 oct\. 2026.*20.*30.*H[AE]/,
  );
});
test.each([
  ['invalid-time', 'America/New_York'],
  ['2026-10-14T00:30:00.000Z', 'Moon/Base'],
  ['2026-10-14T00:30:00.000Z', ''],
  ['2026-10-14T00:30:00.000Z', undefined],
])('unavailable input never silently substitutes the device timezone: %p %p', (raw, zone) => {
  expect(formatRecordedDateTime(raw!, zone as string, 'en-US')).toBe('Date unavailable');
});
