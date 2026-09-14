import { colors, spacing, touchTargets } from './tokens';

function relativeLuminance(hex: string) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );

  return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0);
}

function contrastRatio(first: string, second: string) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('design token baseline', () => {
  it('keeps primary functional text above WCAG AA contrast on white', () => {
    expect(contrastRatio(colors.ink, colors.white)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.inkMuted, colors.white)).toBeGreaterThanOrEqual(4.5);
  });

  it('preserves the documented touch and spacing foundations', () => {
    expect(touchTargets.compact).toBeGreaterThanOrEqual(44);
    expect(touchTargets.standard).toBeGreaterThanOrEqual(48);
    expect(spacing.md).toBe(16);
  });
});
