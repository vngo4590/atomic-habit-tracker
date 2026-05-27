---
name: atomic-habit-skill-editor
description: Automatically observes each session or command interaction and keeps all atomic-habit-* project skills current. Triggers at the start of every response turn — scan the current conversation context and recent repo changes for skill improvement opportunities, log them to the backlog, and apply high-confidence ones immediately. Only edits skills whose folder name starts with "atomic-habit-" under .agents/skills/. Uses the skill-improvement-loop workflows for observation, logging, and implementation. Also trigger explicitly when the user says "update skills", "refresh skills", or after a significant coding or planning session.
---

# Atomicly Skill Editor

This skill keeps the `atomic-habit-*` project skills accurate and up-to-date as the codebase and conventions evolve. It delegates to the `skill-improvement-loop` observe and implement workflows, scoped exclusively to skills prefixed `atomic-habit-`.

## Scope Constraint

**Only touch skills whose folder name starts with `atomic-habit-`.**

```
.agents/skills/atomic-habit-project-walkthrough/   # in scope
.agents/skills/atomic-habit-skill-editor/          # in scope
.agents/skills/openspec-propose/                   # out of scope - skip silently
```

Never log opportunities for, or edit, skills outside this prefix.

## Per-Turn Observation (Automatic Mode)

At the start of each response turn, do a lightweight scan — no file reads required unless something concrete is spotted:

1. **Scan the current conversation** for anything that would make an existing `atomic-habit-*` skill more accurate:
   - A correction the user gave that contradicts a skill's current content.
   - A convention, command, or file path mentioned that isn't in any skill yet.
   - A workflow that repeated itself and belongs in the walkthrough.
   - A stale instruction (e.g., skill says "use X" but the user just changed it to "use Y").

2. **If something concrete is found**, log it immediately:
   ```bash
   python .agents/skills/skill-improvement-loop/scripts/log_opportunity.py \
     --skill atomic-habit-<target-skill> \
     --kind skill-update \
     --summary "<one sentence>" \
     --evidence "<what in this turn justifies the update>" \
     --recommendation "<smallest useful change>" \
     --impact <low|medium|high> \
     --confidence <0.0-1.0>
   ```

3. **Apply immediately** if `confidence >= 0.85` AND `impact >= medium`:
   - Read the target SKILL.md.
   - Make the smallest durable change (add a line, fix a path, update a command).
   - Validate:
     ```bash
     python "C:/Users/Aaron Ngo/.codex/skills/.system/skill-creator/scripts/quick_validate.py" .agents/skills/<skill-name>
     ```
   - Mark the backlog entry applied:
     ```bash
     python .agents/skills/skill-improvement-loop/scripts/update_opportunity.py \
       --id <id> --status applied --notes "Applied: <brief description>"
     ```

4. **Otherwise** leave it queued. Do not block the user's primary task for low-confidence updates.

## Detecting Repo-Change Opportunities

When the user makes file edits or commits, check which files changed:

```bash
git diff --name-only HEAD~1 HEAD 2>/dev/null || git diff --name-only
```

Files that commonly signal a skill update is needed:

| Changed file pattern | Likely skill to update |
|---|---|
| `prisma/schema.prisma` | `atomic-habit-project-walkthrough` |
| `lib/types.ts` | `atomic-habit-project-walkthrough` |
| New `app/(root)/*/page.tsx` | `atomic-habit-project-walkthrough` (Routes table) |
| `AGENTS.md` | `atomic-habit-project-walkthrough` (Conventions) |
| `.agents/skills/atomic-habit-*/SKILL.md` | `atomic-habit-skill-editor` (if editing rules changed) |

## Scheduled Implementation Session

Run when the user explicitly says "apply skill updates", "run skill maintenance", or the backlog has accumulated:

1. Review queued entries — filter to `atomic-habit-*` only:
   ```bash
   python .agents/skills/skill-improvement-loop/scripts/review_backlog.py --status queued
   ```

2. Pick up to 3 entries ordered by impact then confidence.

3. For each entry:
   - Read the target SKILL.md.
   - Apply the smallest durable change from `recommendation`.
   - Validate and sync (see commands above).
   - Mark applied.

4. Report what changed and what remains queued.

## Current-State Audit Session

Run when the user asks to "look through code and update Atomicly skills", "refresh Atomicly skills", or similar:

1. Inspect current project state before editing:
   ```bash
   rg --files app lib components prisma scripts docs openspec
   Get-Content -Raw package.json
   Get-Content -Raw README.md
   Get-Content -Raw AGENTS.md
   openspec list --json
   ```

2. Check high-signal implementation files for architecture drift:
   - `auth.ts`, `proxy.ts`, `lib/auth/*`, `lib/db/*`, `lib/contracts/*`, `lib/actions/domain.ts`, `lib/repositories/*`
   - `app/(root)/layout.tsx`, `app/(auth)/*`, `app/api/v1/README.md`, and route handlers under `app/api/v1/`
   - `prisma/schema.prisma`, `.env.example`, `docs/architecture/backend-auth-mobile.md`

3. Update only `atomic-habit-*` skills under `.agents/skills/`, with preference for:
   - factual version/path/status corrections,
   - concise workflow changes future agents can apply,
   - current OpenSpec archive/active-change state,
   - deployment/runtime facts that prevent incorrect operational advice.

4. Validate every edited skill with `quick_validate.py`.

## New Skill Detection

Log a `NEW_SKILL` opportunity when a recurring, project-specific pattern appears that no existing `atomic-habit-*` skill covers. Name new project skills `atomic-habit-<descriptive-name>`.

```bash
python .agents/skills/skill-improvement-loop/scripts/log_opportunity.py \
  --skill NEW_SKILL \
  --kind new-skill \
  --summary "Proposed: atomic-habit-<name>" \
  --evidence "<what recurring pattern justifies this>" \
  --recommendation "Create atomic-habit-<name> covering <scope>" \
  --impact medium \
  --confidence 0.7
```

## Guardrails

- **Never edit skills outside `atomic-habit-*`** — skip silently if an opportunity targets another skill.
- Do not block the user's primary task. Log in the background; only apply high-confidence items immediately.
- Do not make broad rewrites during observation passes — smallest durable change only.
- Do not invent session evidence. Lower confidence to reflect speculation.
- Always run `quick_validate.py` after any SKILL.md edit.
- Backlog lives at `.agents/skill-improvement/opportunities.jsonl`. Use the scripts; never edit JSON directly.
