import { iconography, shift6IconGlyphs } from './iconography';

describe('SHIFT6 iconography contract', () => {
  it('exposes semantic names for the current fallback glyphs', () => {
    expect(iconography.names).toHaveLength(Object.keys(shift6IconGlyphs).length);
    expect(iconography.names).toContain('home');
    expect(iconography.names).toContain('progress');
  });
});
