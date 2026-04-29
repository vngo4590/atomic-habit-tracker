---
name: skill-improvement-loop
description: Observe Codex work sessions for repeatable skill improvement opportunities, log concrete changes against project-local skills, run scheduled skill implementation sessions from the backlog, and recommend new skills when recurring work patterns are not covered by an existing skill. Use after substantial coding, planning, debugging, review, or research sessions; when a session reveals a skill gap, stale instruction, missing script/reference, validation weakness, or repeated workflow; and when the user asks to improve, audit, maintain, or evolve skills.
---

# Skill Improvement Loop

## Core Rule

Treat skill improvement as a separate maintenance loop from the user's primary task. Do not interrupt task completion to edit skills unless the user explicitly asks for skill maintenance in the same turn.

This skill cannot run background jobs by itself. "Scheduled autonomous sessions" means a user, automation, or future Codex turn invokes this skill on a cadence. During those sessions, apply queued improvements with normal repository editing and validation.

## Workflows

### Observe A Session

Use this at the end of a meaningful work session, or when the user asks to capture improvement opportunities.

1. Identify concrete friction from the session:
   - Repeated commands, searches, or setup steps.
   - Missing or stale skill instructions.
   - A validation or safety check that should have been explicit.
   - A reusable script, reference, asset, or template that would reduce future effort.
   - A recurring task pattern with no existing skill.
2. Inspect available project skills before assigning a target:
   - Canonical project-local skills: `.agents/skills/*/SKILL.md`.
   - Generated compatibility copies/links: `.claude/skills/*/SKILL.md` and `~/.codex/skills/*/SKILL.md`.
   - Codex skills, only if relevant and readable: `~/.codex/skills/*/SKILL.md`.
3. Log one opportunity per actionable improvement using `scripts/log_opportunity.py`.
4. Keep entries evidence-based. Include the observed trigger, affected skill or `NEW_SKILL`, and the smallest useful recommendation.

Example:

```bash
python .agents/skills/skill-improvement-loop/scripts/log_opportunity.py --skill openspec-apply-change --kind skill-update --summary "Require reading local AGENTS.md before editing Next.js routes" --evidence "Phase work required repo-specific Next.js docs before code changes" --recommendation "Add a pre-edit checklist item for repo instruction files and framework docs" --impact medium --confidence 0.8
```

### Recommend A New Skill

Log `--skill NEW_SKILL --kind new-skill` when a pattern is repeated or likely to repeat and no existing skill has a matching description.

Only recommend a new skill when at least one is true:

- The same workflow has appeared in multiple sessions.
- The workflow depends on project-specific conventions, commands, or artifacts.
- A reusable script/reference/template would materially reduce future mistakes.
- Existing skills would become too broad or confusing if expanded to cover it.

Include a suggested skill name in the recommendation.

### Run A Scheduled Implementation Session

Use this when the user asks to apply queued improvements, run scheduled skill maintenance, or execute this meta-skill autonomously.

1. Review the backlog:

```bash
python .agents/skills/skill-improvement-loop/scripts/review_backlog.py --status queued
```

2. Pick a small batch:
   - Prefer high-impact, high-confidence entries.
   - Group entries by target skill.
   - Do not mix unrelated skills in one risky edit.
3. For each selected entry:
   - Read the target `SKILL.md`.
   - Read the relevant log evidence.
   - Make the smallest durable change to `SKILL.md`, `references/`, `scripts/`, or `assets/`.
   - If the entry is `NEW_SKILL`, use `$skill-creator` to create the proposed skill instead of hand-rolling a folder.
4. Validate edited skills:

```bash
python C:\Users\Aaron Ngo\.codex\skills\.system\skill-creator\scripts\quick_validate.py .agents\skills\<skill-name>
```

5. Mark applied entries:

```bash
python .agents/skills/skill-improvement-loop/scripts/update_opportunity.py --id <id> --status applied --notes "Implemented in <path>"
```

6. Report:
   - Entries applied.
   - Skill files changed.
   - Validation run and result.
   - Entries deferred with reasons.

## Backlog Files

The default backlog lives at `.agents/skill-improvement/opportunities.jsonl`. Each line is one JSON record. See `references/backlog-protocol.md` for fields, status meanings, and batch rules.

Use the scripts instead of manual JSON editing unless a script is missing a needed option.

## Guardrails

- Do not invent session evidence. If the reason is speculative, lower `confidence` and mark it as a recommendation.
- Do not make broad rewrites to skills during observe-only passes.
- Do not change system skills under `~/.codex/skills/.system` unless the user explicitly asks and approves any required filesystem escalation.
- Do not edit generated `.claude/skills` or `~/.codex/skills` compatibility links/copies directly. Edit `.agents/skills` and run `scripts/sync-agent-skills.ps1`.
- Preserve a skill's existing scope. If an improvement would overload it, log a new-skill recommendation.
- Prefer adding a concise checklist item or reference pointer over long narrative.
- When adding scripts to skills, run at least one representative script test.
