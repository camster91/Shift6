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
  const normalTextPairs: Array<[string, string, string]> = [
    ['default text on canvas', colors.ink, colors.canvas],
    ['muted text on canvas', colors.inkMuted, colors.canvas],
    ['inverse text on ink', colors.white, colors.ink],
    ['secondary-button text', colors.ink, colors.lavenderBackground],
    ['success status text', colors.success, colors.canvas],
    ['warning status text', colors.warning, colors.canvas],
    ['error status text', colors.error, colors.canvas],
    ['info status text', colors.info, colors.canvas],
    ['ink on lavender', colors.ink, colors.lavender],
    ['ink on blue', colors.ink, colors.blue],
    ['ink on mint', colors.ink, colors.mint],
    ['ink on cyan', colors.ink, colors.cyan],
    ['ink on yellow', colors.ink, colors.yellow],
    ['ink on coral', colors.ink, colors.coral],
    ['ink on pink', colors.ink, colors.pink],
  ];

  it.each(normalTextPairs)('%s keeps at least 4.5:1 contrast', (_name, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it('preserves the documented touch and spacing foundations', () => {
    expect(touchTargets.compact).toBeGreaterThanOrEqual(44);
    expect(touchTargets.standard).toBeGreaterThanOrEqual(48);
    expect(spacing.md).toBe(16);
  });
});
