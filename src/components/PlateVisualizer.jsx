/**
 * PlateVisualizer — Track-aware weight visualization.
 *
 * Renders an SVG barbell (full_gym) with colored plates stacked on each side,
 * or a single dumbbell (home_gym) sized and colored to the prescribed weight.
 *
 * Standard plate set:
 *   45 lb red, 35 lb blue, 25 lb yellow, 10 lb green, 5 lb silver, 2.5 lb red.
 * Bar is 45 lb (Olympic standard). Weights below 45 lb show the bar only.
 *
 * Dumbbell sizes: 5/10/15/20/25/30/40/50 lb standard home-gym set.
 */

// Standard barbell plate set in lbs. Visual size scales with weight; colors
// match common gym conventions (red=45, blue=35, yellow=25, green=10, white=5, red=2.5).
const BAR_PLATES = [
  { weight: 45, color: '#ef4444', size: 64 },
  { weight: 35, color: '#3b82f6', size: 56 },
  { weight: 25, color: '#eab308', size: 48 },
  { weight: 10, color: '#22c55e', size: 36 },
  { weight: 5,  color: '#94a3b8', size: 28 },
  { weight: 2.5, color: '#f87171', size: 22 },
];

const BARBELL_BAR_LBS = 45;

const DUMBBELL_HEADS = [
  { weight: 50, color: '#ef4444', size: 60 },
  { weight: 40, color: '#3b82f6', size: 56 },
  { weight: 30, color: '#eab308', size: 52 },
  { weight: 25, color: '#22c55e', size: 48 },
  { weight: 20, color: '#a855f7', size: 44 },
  { weight: 15, color: '#06b6d4', size: 40 },
  { weight: 10, color: '#94a3b8', size: 36 },
  { weight: 5,  color: '#64748b', size: 30 },
];

export default function PlateVisualizer({ weight, track = 'full_gym', compact = false }) {
  if (!weight || weight <= 0) return null;

  if (track === 'home_gym') {
    const head = DUMBBELL_HEADS.find(h => h.weight === weight)
      || DUMBBELL_HEADS.reduce((closest, h) =>
        Math.abs(h.weight - weight) < Math.abs(closest.weight - weight) ? h : closest,
        DUMBBELL_HEADS[0]);

    return (
      <div className={`flex ${compact ? 'flex-row items-center gap-3' : 'flex-col items-center gap-2'} mt-1`}>
        {!compact && <p className="armor-text-caption">Load per hand</p>}
        <DumbbellSvg size={compact ? Math.min(head.size, 48) : head.size} color={head.color} weight={weight} compact={compact} />
        {!compact && <p className="text-[11px] text-slate-500">{weight} lb dumbbell</p>}
      </div>
    );
  }

  if (weight < BARBELL_BAR_LBS) {
    return (
      <div className={`flex ${compact ? 'flex-row items-center gap-3' : 'flex-col items-center gap-2'} mt-1`}>
        {!compact && <p className="armor-text-caption">Bar only</p>}
        <BarbellSvg plates={[]} barOnly compact={compact} weight={weight} />
        {!compact && <p className="text-[11px] text-slate-500">45 lb bar (use less than bar weight if possible)</p>}
      </div>
    );
  }

  const perSide = (weight - BARBELL_BAR_LBS) / 2;
  const plates = [];
  let remaining = perSide;
  for (const p of BAR_PLATES) {
    while (remaining >= p.weight - 0.001) {
      plates.push(p);
      remaining -= p.weight;
    }
  }

  return (
    <div className={`flex ${compact ? 'flex-row items-center gap-2' : 'flex-col items-center gap-2'} mt-1`}>
      {!compact && <p className="armor-text-caption">Per side</p>}
      <BarbellSvg plates={plates} compact={compact} weight={weight} />
      <div className="flex flex-wrap gap-1 justify-center max-w-[280px]">
        {plates.length > 0 ? plates.map((p, i) => (
          <span key={i}
            className="px-1.5 py-0.5 rounded text-[9px] font-bold"
            style={{ background: p.color + '33', color: p.color }}>
            {p.weight}
          </span>
        )) : <span className="text-[10px] text-slate-600">empty bar</span>}
        {!compact && <span className="text-[10px] text-slate-600 self-center ml-1">lbs/side</span>}
      </div>
    </div>
  );
}

// SVG barbell: long horizontal bar with two sleeve collars and plates on each side.
function BarbellSvg({ plates = [], barOnly = false, compact = false, weight }) {
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
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className="drop-shadow-md"
      role="img"
      aria-label={`Barbell loaded to ${weight} lbs`}
    >
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
          {barOnly ? '45 LB BAR' : '45 LB BAR + PLATES'}
        </text>
      )}
    </svg>
  );
}

// SVG dumbbell: handle + two weighted heads.
function DumbbellSvg({ size, color, weight, compact = false }) {
  const scale = compact ? 0.8 : 1;
  const W = compact ? 140 : 160, H = size * scale + (compact ? 12 : 20);
  const centerY = H / 2;
  const headW = size * scale * 0.4;
  const headH = size * scale;
  const handleW = W - 2 * headW - (compact ? 24 : 30);
  const handleH = size * scale * 0.18;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className="drop-shadow-md"
      role="img"
      aria-label={`${weight} lb dumbbell`}
    >
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
          {weight} LB
        </text>
      )}
    </svg>
  );
}
