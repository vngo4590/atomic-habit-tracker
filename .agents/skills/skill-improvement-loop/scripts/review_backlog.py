#!/usr/bin/env python3
"""Print queued skill improvement opportunities grouped by target skill."""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path

IMPACT_RANK = {"high": 0, "medium": 1, "low": 2}


def backlog_path(project_root: Path) -> Path:
    return project_root / ".agents" / "skill-improvement" / "opportunities.jsonl"


def load_records(path: Path) -> list[dict[str, object]]:
    if not path.exists():
        return []

    records: list[dict[str, object]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_no, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError as exc:
                raise SystemExit(f"{path}:{line_no}: invalid JSON: {exc}") from exc
    return records


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-root", default=".", help="Repository root. Defaults to cwd.")
    parser.add_argument("--status", default="queued")
    parser.add_argument("--skill", default="")
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of Markdown.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    path = backlog_path(Path(args.project_root).resolve())
    records = [
        record
        for record in load_records(path)
        if record.get("status") == args.status
        and (not args.skill or record.get("skill") == args.skill)
    ]
    records.sort(
        key=lambda record: (
            IMPACT_RANK.get(str(record.get("impact")), 9),
            -float(record.get("confidence") or 0),
            str(record.get("created_at") or ""),
        )
    )
    records = records[: args.limit]

    if args.json:
        print(json.dumps(records, indent=2, sort_keys=True))
        return

    if not records:
        print(f"No {args.status} skill improvement opportunities found at {path}.")
        return

    grouped: dict[str, list[dict[str, object]]] = defaultdict(list)
    for record in records:
        grouped[str(record.get("skill") or "UNKNOWN")].append(record)

    print(f"# Skill Improvement Backlog ({args.status})")
    print()
    for skill, items in grouped.items():
        print(f"## {skill}")
        for item in items:
            print(
                f"- {item.get('id')} [{item.get('impact')}, {item.get('confidence')}] "
                f"{item.get('summary')}"
            )
            print(f"  Recommendation: {item.get('recommendation')}")
        print()


if __name__ == "__main__":
    main()
