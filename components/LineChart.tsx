"use client";

interface LineChartPoint {
  pct: number;
  label?: string;
}

interface LineChartProps {
  data: LineChartPoint[];
}

export function LineChart({ data }: LineChartProps) {
  const width = 720;
  const height = 220;
  const pad = 18;
  const points = data.map((point, index) => {
    const x = data.length <= 1 ? width / 2 : pad + (index / (data.length - 1)) * (width - pad * 2);
    const y = height - pad - (Math.max(0, Math.min(100, point.pct)) / 100) * (height - pad * 2);
    return { x, y, ...point };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = points.length
    ? `${pad},${height - pad} ${line} ${width - pad},${height - pad}`
    : "";

  return (
    <svg role="img" aria-label="Completion trend" viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 240, display: "block" }}>
      <defs>
        <linearGradient id="completion-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
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
      {points.map((point, index) => (
        <circle key={`${point.label ?? index}-${index}`} cx={point.x} cy={point.y} r={index === points.length - 1 ? 4 : 2.5} fill="var(--accent)" />
      ))}
    </svg>
  );
}
