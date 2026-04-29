export function CompletionRing({ pct }: { pct: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg width="64" height="64" viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
      <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--rule)" strokeWidth="4" />
      <circle
        cx="32"
        cy="32"
        r={radius}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="4"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - pct / 100)}
        strokeLinecap="round"
        transform="rotate(-90 32 32)"
        style={{ transition: "stroke-dashoffset .5s cubic-bezier(.3,.7,.4,1)" }}
      />
      <text x="32" y="36" textAnchor="middle" fontFamily="var(--serif)" fontSize="16" fill="var(--ink)">
        {pct}%
      </text>
    </svg>
  );
}
