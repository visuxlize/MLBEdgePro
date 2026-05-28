import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Path,
  Polygon,
  RadialGradient,
  Stop,
} from 'react-native-svg';

interface Props {
  size?: number;
  /** Show the animated radar polygon. Default: true */
  showRadar?: boolean;
}

/**
 * Baseball analytics radar logo — orange/dark palette to match app design.
 * Draws a baseball with concentric radar rings, 6-axis spokes, a
 * hexagonal data polygon, and classic S-curve seam stitches.
 */
export function MLBEdgeLogo({ size = 180, showRadar = true }: Props) {
  const c = size / 2; // center x/y
  const outerR = size * 0.46; // outer circle radius

  // ── Radar ring radii ──────────────────────────────────────────────────────
  const rings = [0.35, 0.58, 0.80, 1.0].map((r) => outerR * r);

  // ── 6-axis spoke endpoints ────────────────────────────────────────────────
  const spokes = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
    return { x: c + outerR * Math.cos(angle), y: c + outerR * Math.sin(angle) };
  });

  // ── Data polygon (simulating real stats variability) ──────────────────────
  const ratios = [0.88, 0.72, 0.92, 0.78, 0.95, 0.68];
  const dataPoints = ratios.map((ratio, i) => {
    const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
    const r = outerR * ratio;
    return { x: c + r * Math.cos(angle), y: c + r * Math.sin(angle) };
  });
  const polygonStr = dataPoints.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

  // ── Baseball seam paths (S-curves on left & right) ────────────────────────
  // Scaled from a 100x100 unit baseball
  const s = size / 100;
  const seamLeft = `M ${33 * s} ${22 * s} C ${12 * s} ${40 * s}, ${12 * s} ${62 * s}, ${33 * s} ${78 * s}`;
  const seamRight = `M ${67 * s} ${22 * s} C ${88 * s} ${40 * s}, ${88 * s} ${62 * s}, ${67 * s} ${78 * s}`;
  // Short stitches on each seam (pairs of tiny perpendicular lines)
  const leftStitches = [38, 48, 62].map((yUnit) => {
    const y = yUnit * s;
    const xBase = (yUnit < 50 ? 20 : 18) * s;
    return { x1: xBase - 4 * s, y1: y - 3 * s, x2: xBase + 4 * s, y2: y + 3 * s };
  });
  const rightStitches = [38, 48, 62].map((yUnit) => {
    const y = yUnit * s;
    const xBase = (yUnit < 50 ? 80 : 82) * s;
    return { x1: xBase - 4 * s, y1: y + 3 * s, x2: xBase + 4 * s, y2: y - 3 * s };
  });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <RadialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FF7828" stopOpacity="0.18" />
          <Stop offset="100%" stopColor="#FF7828" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Outer ambient glow */}
      <Circle cx={c} cy={c} r={outerR + size * 0.1} fill="url(#glowGrad)" />

      {/* ── Baseball base ──────────────────────────────────────────────── */}
      <Circle cx={c} cy={c} r={outerR} fill="#0A0E14" stroke="rgba(255,120,40,0.30)" strokeWidth={1.5} />

      {/* ── Radar rings ────────────────────────────────────────────────── */}
      {rings.map((r, i) => (
        <Circle
          key={`ring-${i}`}
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="rgba(255,120,40,0.10)"
          strokeWidth={0.8}
          strokeDasharray={i < 3 ? '3,4' : undefined}
        />
      ))}

      {/* ── Axis spokes ────────────────────────────────────────────────── */}
      {spokes.map((pt, i) => (
        <Line
          key={`spoke-${i}`}
          x1={c}
          y1={c}
          x2={pt.x}
          y2={pt.y}
          stroke="rgba(255,120,40,0.12)"
          strokeWidth={0.7}
        />
      ))}

      {/* ── Data polygon (only when showRadar) ─────────────────────────── */}
      {showRadar && (
        <Polygon
          points={polygonStr}
          fill="rgba(255,120,40,0.14)"
          stroke="#FF7828"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      )}

      {/* ── Baseball seam curves ───────────────────────────────────────── */}
      <Path d={seamLeft} stroke="#FF7828" strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={0.65} />
      <Path d={seamRight} stroke="#FF7828" strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={0.65} />

      {/* Stitches on left seam */}
      {leftStitches.map((st, i) => (
        <Line key={`ls-${i}`} x1={st.x1} y1={st.y1} x2={st.x2} y2={st.y2} stroke="#FF7828" strokeWidth={1.2} strokeLinecap="round" opacity={0.5} />
      ))}
      {/* Stitches on right seam */}
      {rightStitches.map((st, i) => (
        <Line key={`rs-${i}`} x1={st.x1} y1={st.y1} x2={st.x2} y2={st.y2} stroke="#FF7828" strokeWidth={1.2} strokeLinecap="round" opacity={0.5} />
      ))}

      {/* ── Data points on polygon ─────────────────────────────────────── */}
      {showRadar && dataPoints.map((pt, i) => (
        <G key={`dp-${i}`}>
          <Circle cx={pt.x} cy={pt.y} r={4.5} fill="rgba(255,120,40,0.25)" />
          <Circle cx={pt.x} cy={pt.y} r={2.5} fill="#FF7828" />
        </G>
      ))}

      {/* ── Center dot ─────────────────────────────────────────────────── */}
      <Circle cx={c} cy={c} r={size * 0.07} fill="rgba(255,120,40,0.20)" />
      <Circle cx={c} cy={c} r={size * 0.035} fill="#FF7828" />
    </Svg>
  );
}
