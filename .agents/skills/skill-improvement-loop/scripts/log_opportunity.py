#!/usr/bin/env python3
"""Append a skill improvement opportunity to the project backlog."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

VALID_STATUSES = {"queued", "applied", "rejected", "deferred"}
VALID_KINDS = {"skill-update", "new-skill", "script", "reference", "validation", "routing"}
VALID_IMPACTS = {"low", "medium", "high"}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def backlog_path(project_root: Path) -> Path:
    return project_root / ".agents" / "skill-improvement" / "opportunities.jsonl"


def make_id(record: dict[str, object]) -> str:
    source = "|".join(
        str(record[key])
        for key in ("created_at", "skill", "kind", "summary", "recommendation")
    )
    return hashlib.sha1(source.encode("utf-8")).hexdigest()[:12]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-root", default=".", help="Repository root. Defaults to cwd.")
    parser.add_argument("--skill", required=True, help="Target skill folder name, NEW_SKILL, or UNKNOWN.")
    parser.add_argument("--kind", required=True, choices=sorted(VALID_KINDS))
    parser.add_argument("--summary", required=True)
    parser.add_argument("--evidence", required=True)
    parser.add_argument("--recommendation", required=True)
    parser.add_argument("--impact", default="medium", choices=sorted(VALID_IMPACTS))
    parser.add_argument("--confidence", type=float, default=0.7)
    parser.add_argument("--source-session", default="")
    parser.add_argument("--status", default="queued", choices=sorted(VALID_STATUSES))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not 0 <= args.confidence <= 1:
        raise SystemExit("--confidence must be between 0 and 1")

    project_root = Path(args.project_root).resolve()
    now = utc_now()
    record: dict[str, object] = {
        "created_at": now,
        "updated_at": now,
        "status": args.status,
        "skill": args.skill,
        "kind": args.kind,
        "summary": args.summary,
        "evidence": args.evidence,
        "recommendation": args.recommendation,
        "impact": args.impact,
        "confidence": args.confidence,
        "source_session": args.source_session,
        "notes": "",
    }
    record["id"] = make_id(record)

    path = backlog_path(project_root)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, sort_keys=True) + "\n")

    print(f"logged {record['id']} -> {path}")


if __name__ == "__main__":
    main()
