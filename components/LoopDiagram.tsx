import type { Habit } from "@/lib/types";

export function LoopDiagram({ habit }: { habit: Habit }) {
  const cells = [
    ["01", "Cue", "When", habit.cue],
    ["02", "Craving", "I want", habit.craving],
    ["03", "Response", "So I", habit.response],
    ["04", "Reward", "And I get", habit.reward],
  ];

  return (
    <div>
      <p className="lede" style={{ marginBottom: 24, fontStyle: "italic" }}>
        Every habit follows the same four steps. Here&apos;s yours, laid out as a sentence diagram.
      </p>
      <div className="loop">
        {cells.map(([number, step, lead, value]) => (
          <div key={number} className="loop-cell">
            <div className="loop-step">{number} · {step}</div>
            <div className="loop-label">{lead}</div>
            <div className="loop-value">{value}</div>
            <div className="loop-arrow" />
          </div>
        ))}
      </div>
      <div className="card card-pad" style={{ marginTop: 24, background: "var(--bg-sunk)" }}>
        <h3 className="h3" style={{ marginBottom: 8 }}>The loop in a sentence</h3>
        <p style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 20, fontStyle: "italic", color: "var(--ink-2)", lineHeight: 1.4 }}>
          When <span style={{ color: "var(--ink)" }}>{habit.cue.toLowerCase()}</span>, I crave{" "}
          <span style={{ color: "var(--ink)" }}>{habit.craving.toLowerCase() || "the reward"}</span>, so I{" "}
          <span style={{ color: "var(--ink)" }}>{habit.response.toLowerCase()}</span>, and the reward is{" "}
          <span style={{ color: "var(--accent)" }}>{habit.reward.toLowerCase() || "a vote for my identity"}</span>.
        </p>
      </div>
    </div>
  );
}
