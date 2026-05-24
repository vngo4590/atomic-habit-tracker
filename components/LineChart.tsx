"use client";

import styles from "./LineChart.module.css";

/** A single point on the completion-trend line chart. */
interface LineChartPoint {
  /** 0–100 completion percentage at this point. */
  pct: number;
  /** Optional axis label (e.g. a date). */
  label?: string;
}

interface LineChartProps {
  data: LineChartPoint[];
}

/**
 * LineChart — SVG completion-trend line chart used on the Analytics page.
 *
 * Pure presentational component: takes an array of {pct, label} points
 * and renders a smooth line + filled area + tick lines at 0/25/50/75/100.
 * The viewBox is 720x220 and scales fluidly via the .svg module class.
 */
export function LineChart({ data }: LineChartProps) {
  // Internal coordinate system (the SVG viewBox), independent of the
  // rendered pixel size. We scale fluidly with width: 100% on the <svg>.
  const width = 720;
  const height = 220;
  const pad = 18;

  // Project each input point into SVG coordinates.
  const points = data.map((point, index) => {
    const x = data.length <= 1 ? width / 2 : pad + (index / (data.length - 1)) * (width - pad * 2);
    const y = height - pad - (Math.max(0, Math.min(100, point.pct)) / 100) * (height - pad * 2);
    return { x, y, ...point };
  });

  // Polyline path string and the closed area polygon below the line.
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = points.length
    ? `${pad},${height - pad} ${line} ${width - pad},${height - pad}`
    : "";

  return (
    <svg
      role="img"
      aria-label="Completion trend"
      viewBox={`0 0 ${width} ${height}`}
      className={styles.svg}
    >
      <defs>
        <linearGradient id="completion-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Horizontal tick lines at 0/25/50/75/100 with labels. */}
      {[0, 25, 50, 75, 100].map((tick) => {
        const y = height - pad - (tick / 100) * (height - pad * 2);
        return (
          <g key={tick}>
            <line x1={pad} x2={width - pad} y1={y} y2={y} stroke="var(--rule)" strokeDasharray="3 6" />
            <text x={pad} y={y - 5} fill="var(--ink-3)" fontSize="10" fontFamily="var(--mono)">
              {tick}
            </text>
          </g>
        );
      })}
      {area && <polygon points={area} fill="url(#completion-area)" />}
      {line && <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      {/* Emphasise the most recent point with a slightly larger dot. */}
      {points.map((point, index) => (
        <circle key={`${point.label ?? index}-${index}`} cx={point.x} cy={point.y} r={index === points.length - 1 ? 4 : 2.5} fill="var(--accent)" />
      ))}
    </svg>
  );
}
