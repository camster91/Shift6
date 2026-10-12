import { redirectSystemPath } from '../../app/+native-intent';
import { safeNativeLink } from './nativeLinks';

test.each([
  'shift6://workout?sessionId=abc-123',
  'shift6://exercise/squat?name=Fran%C3%A7ais+%26+%E2%9C%93',
  'shift6://auth/callback?state=a%2Bb%3D&redirect=https%3A%2F%2Fexample.com',
  'shift6://exercise/custom?name=%25FF',
])('preserves valid links byte for byte: %s', (path) => {
  expect(safeNativeLink(path)).toBe(path);
});

test.each(['shift6://workout?q=%', 'shift6://workout?q=%FE%FF', 'shift6://workout?q=%E2%82'])(
  'recovers from malformed external links on cold and warm launch: %s',
  (path) => {
    expect(redirectSystemPath({ path, initial: true })).toBe('/link-unavailable');
    expect(redirectSystemPath({ path, initial: false })).toBe('/link-unavailable');
  },
);

test('bounds external input and rejects long malformed UTF-8 without the router decoder', () => {
  expect(safeNativeLink(`shift6://workout?q=${'%FF'.repeat(2000)}`)).toBe('/link-unavailable');
  expect(safeNativeLink(`shift6://workout?q=${'x'.repeat(8192)}`)).toBe('/link-unavailable');
});
