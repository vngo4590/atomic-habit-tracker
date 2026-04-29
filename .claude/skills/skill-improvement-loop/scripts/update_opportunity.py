#!/usr/bin/env python3
"""Update the status or notes for a logged skill improvement opportunity."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

VALID_STATUSES = {"queued", "applied", "rejected", "deferred"}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def backlog_path(project_root: Path) -> Path:
    return project_root / ".claude" / "skill-improvement" / "opportunities.jsonl"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-root", default=".", help="Repository root. Defaults to cwd.")
    parser.add_argument("--id", required=True, help="Opportunity id to update.")
    parser.add_argument("--status", choices=sorted(VALID_STATUSES))
    parser.add_argument("--notes")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    path = backlog_path(Path(args.project_root).resolve())
    if not path.exists():
        raise SystemExit(f"Backlog not found: {path}")

    updated = False
    records: list[dict[str, object]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_no, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError as exc:
                raise SystemExit(f"{path}:{line_no}: invalid JSON: {exc}") from exc

            if record.get("id") == args.id:
                if args.status:
                    record["status"] = args.status
                if args.notes is not None:
                    record["notes"] = args.notes
                record["updated_at"] = utc_now()
                updated = True
            records.append(record)

    if not updated:
        raise SystemExit(f"No opportunity found with id {args.id}")

    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for record in records:
            handle.write(json.dumps(record, sort_keys=True) + "\n")

    print(f"updated {args.id} -> {path}")


if __name__ == "__main__":
    main()
