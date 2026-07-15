/**
 * PlateVisualizer — Track-aware weight visualization.
 *
 * Renders an SVG barbell (full_gym) with colored plates stacked on each side,
 * or a single dumbbell (home_gym) sized and colored to the prescribed weight.
 *
 * The `weight` prop is in the user's selected unit (lbs or kg). The visualizer
 * works in whichever unit you pass — it does not convert internally.
 *
 * Plate sets:
 *   US lbs:  45/35/25/10/5/2.5 — 45 lb bar (Olympic standard)
 *   Metric:  25/20/15/10/5/2.5/1.25 — 20 kg bar (Olympic standard, IPF)
 *
 * Dumbbell sizes (home_gym):
 *   US lbs:  5/10/15/20/25/30/40/50 (common home set)
 *   Metric:  2.5/5/7.5/10/12.5/15/20/25 (common home set)
 */
import { memo } from 'react';

// US Olympic plate set (lbs). Colors follow common gym conventions.
const BAR_PLATES_LBS = [
  { weight: 45,   color: '#ef4444', size: 64 },
  { weight: 35,   color: '#3b82f6', size: 56 },
  { weight: 25,   color: '#eab308', size: 48 },
  { weight: 10,   color: '#22c55e', size: 36 },
  { weight: 5,    color: '#94a3b8', size: 28 },
  { weight: 2.5,  color: '#f87171', size: 22 },
];

// IPF/competition Olympic plate set (kg). Standard colors per IWF spec.
const BAR_PLATES_KG = [
  { weight: 25,   color: '#ef4444', size: 64 },
  { weight: 20,   color: '#3b82f6', size: 60 },
  { weight: 15,   color: '#eab308', size: 54 },
  { weight: 10,   color: '#22c55e', size: 46 },
  { weight: 5,    color: '#f8fafc', size: 36 },
  { weight: 2.5,  color: '#ef4444', size: 28 },
  { weight: 1.25, color: '#cbd5e1', size: 22 },
];

const BARBELL_BAR_LBS = 45;
const BARBELL_BAR_KG = 20;

const DUMBBELL_HEADS_LBS = [
  { weight: 50, color: '#ef4444', size: 60 },
  { weight: 40, color: '#3b82f6', size: 56 },
  { weight: 30, color: '#eab308', size: 52 },
  { weight: 25, color: '#22c55e', size: 48 },
  { weight: 20, color: '#a855f7', size: 44 },
  { weight: 15, color: '#06b6d4', size: 40 },
  { weight: 10, color: '#94a3b8', size: 36 },
  { weight: 5,  color: '#64748b', size: 30 },
];

const DUMBBELL_HEADS_KG = [
  { weight: 25,  color: '#ef4444', size: 60 },
  { weight: 20,  color: '#3b82f6', size: 56 },
  { weight: 15,  color: '#eab308', size: 52 },
  { weight: 12.5, color: '#22c55e', size: 48 },
  { weight: 10,  color: '#a855f7', size: 44 },
  { weight: 7.5, color: '#06b6d4', size: 40 },
  { weight: 5,   color: '#94a3b8', size: 36 },
  { weight: 2.5, color: '#64748b', size: 30 },
];

const PlateVisualizer = memo(function PlateVisualizer({ weight, track = 'full_gym', compact = false, unit = 'lbs' }) {
  if (!weight || weight <= 0) return null;

  const isKg = unit === 'kg';
  const bar = isKg ? BARBELL_BAR_KG : BARBELL_BAR_LBS;
  const plates = isKg ? BAR_PLATES_KG : BAR_PLATES_LBS;
  const dumbbells = isKg ? DUMBBELL_HEADS_KG : DUMBBELL_HEADS_LBS;
  const epsilon = 0.01;

  if (track === 'home_gym') {
    // Snap to the closest dumbbell in the user's unit.
    const head = dumbbells.find(h => Math.abs(h.weight - weight) < epsilon)
      || dumbbells.reduce((closest, h) =>
        Math.abs(h.weight - weight) < Math.abs(closest.weight - weight) ? h : closest,
        dumbbells[0]);

    return (
      <div className={`flex ${compact ? 'flex-row items-center gap-3' : 'flex-col items-center gap-2'} mt-1`}>
        {!compact && <p className="armor-text-caption">Load per hand</p>}
        <DumbbellSvg size={compact ? Math.min(head.size, 48) : head.size} color={head.color} weight={weight} unit={unit} compact={compact} />
        {!compact && <p className="text-[11px] text-[var(--text-tertiary)]">{weight} {unit} dumbbell</p>}
      </div>
    );
  }

  if (weight < bar) {
    return (
      <div className={`flex ${compact ? 'flex-row items-center gap-3' : 'flex-col items-center gap-2'} mt-1`}>
        {!compact && <p className="armor-text-caption">Bar only</p>}
        <BarbellSvg plates={[]} barOnly bar={bar} unit={unit} compact={compact} />
        {!compact && <p className="text-[11px] text-[var(--text-tertiary)]">{bar} {unit} bar (use less than bar weight if possible)</p>}
      </div>
    );
  }

  const perSide = (weight - bar) / 2;
  const used = [];
  let remaining = perSide;
  for (const p of plates) {
    while (remaining >= p.weight - epsilon) {
      used.push(p);
      remaining -= p.weight;
    }
  }
  // Tolerate tiny remainders from unit-conversion rounding (e.g. 0.4 kg left
  // after picking all the 25/20/15/10/5/2.5 plates). Round the remainder to
  // one decimal and surface it as a "+X.X" tag so the user knows the
  // visualizer is close-but-not-exact.
  const remainder = Math.round(remaining * 10) / 10;

  return (
    <div className={`flex ${compact ? 'flex-row items-center gap-2' : 'flex-col items-center gap-2'} mt-1`}>
      {!compact && <p className="armor-text-caption">Per side</p>}
      <BarbellSvg plates={used} bar={bar} unit={unit} compact={compact} />
      <div className="flex flex-wrap gap-1 justify-center max-w-[280px]">
        {used.length > 0 ? used.map((p, i) => (
          <span key={i}
            className="px-1.5 py-0.5 rounded text-[9px] font-bold"
            style={{ background: p.color + '33', color: p.color }}>
            {p.weight}
          </span>
        )) : <span className="text-[10px] text-[var(--text-disabled)]">empty bar</span>}
        {remainder > 0 && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--color-warning-muted)] text-[var(--color-warning)]">
            +{remainder}
          </span>
        )}
        {!compact && <span className="text-[10px] text-[var(--text-disabled)] self-center ml-1">{unit}/side</span>}
      </div>
    </div>
  );
});

export default PlateVisualizer;

// SVG barbell: long horizontal bar with two sleeve collars and plates on each side.
function BarbellSvg({ plates = [], barOnly = false, bar = 45, unit = 'lbs', compact = false }) {
  const W = compact ? 200 : 240, H = compact ? 48 : 64;
  const centerY = H / 2;
  const barH = compact ? 5 : 6;
  const collarW = 4, collarH = compact ? 14 : 18;
  const sleeveL = compact ? 24 : 30, sleeveR = compact ? 190 : 230;
  const plateW = 10;
  const scale = compact ? 0.75 : 1;

  const leftPlates = plates.map((p, i) => ({
    x: sleeveL - (i + 1) * plateW,
    w: plateW,
    h: p.size * scale,
    y: centerY - (p.size * scale) / 2,
    color: p.color,
  }));
  const rightPlates = plates.map((p, i) => ({
    x: sleeveR + i * plateW,
    w: plateW,
    h: p.size * scale,
    y: centerY - (p.size * scale) / 2,
    color: p.color,
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="drop-shadow-md">
      <rect x={0} y={centerY - barH / 2} width={W} height={barH} rx={1.5} fill="#cbd5e1" />
      <rect x={W/2 - 30} y={centerY - barH / 2} width={60} height={barH} fill="#94a3b8" />
      <rect x={sleeveL} y={centerY - 5} width={10} height={10} fill="#94a3b8" />
      <rect x={sleeveR - 10} y={centerY - 5} width={10} height={10} fill="#94a3b8" />
      <rect x={sleeveL - 4} y={centerY - collarH / 2} width={collarW} height={collarH} rx={1} fill="#64748b" />
      <rect x={sleeveR} y={centerY - collarH / 2} width={collarW} height={collarH} rx={1} fill="#64748b" />
      {leftPlates.map((p, i) => (
        <rect key={`l${i}`} x={p.x} y={p.y} width={p.w} height={p.h} rx={2}
          fill={p.color} stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />
      ))}
      {rightPlates.map((p, i) => (
        <rect key={`r${i}`} x={p.x} y={p.y} width={p.w} height={p.h} rx={2}
          fill={p.color} stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />
      ))}
      {!compact && (
        <text x={W / 2} y={H - 2} textAnchor="middle"
          fontSize="8" fill="rgba(148,163,184,0.6)" fontFamily="monospace">
          {barOnly ? `${bar} ${unit.toUpperCase()} BAR` : `${bar} ${unit.toUpperCase()} BAR + PLATES`}
        </text>
      )}
    </svg>
  );
}

// SVG dumbbell: handle + two weighted heads.
function DumbbellSvg({ size, color, weight, unit = 'lbs', compact = false }) {
  const scale = compact ? 0.8 : 1;
  const W = compact ? 140 : 160, H = size * scale + (compact ? 12 : 20);
  const centerY = H / 2;
  const headW = size * scale * 0.4;
  const headH = size * scale;
  const handleW = W - 2 * headW - (compact ? 24 : 30);
  const handleH = size * scale * 0.18;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="drop-shadow-md">
      <rect x={W / 2 - handleW / 2} y={centerY - handleH / 2} width={handleW} height={handleH} rx={handleH / 2}
        fill="#cbd5e1" />
      <rect x={W / 2 - handleW / 2 + 4} y={centerY - handleH / 2} width={handleW - 8} height={handleH}
        fill="#94a3b8" opacity="0.4" />
      <rect x={W / 2 - handleW / 2 - headW} y={centerY - headH / 2} width={headW} height={headH} rx={headH * 0.15}
        fill={color} stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
      <rect x={W / 2 + handleW / 2} y={centerY - headH / 2} width={headW} height={headH} rx={headH * 0.15}
        fill={color} stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
      {!compact && (
        <text x={W / 2} y={H - 4} textAnchor="middle"
          fontSize="9" fontWeight="bold" fill={color} fontFamily="monospace">
          {weight} {unit.toUpperCase()}
        </text>
      )}
    </svg>
  );
}
