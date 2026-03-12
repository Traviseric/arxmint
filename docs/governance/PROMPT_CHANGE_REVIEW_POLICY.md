# Prompt Change Review Policy

## Purpose

Prompt and template changes can alter payment behavior, auth flows, or operational decisions.
This policy makes those changes reviewable and auditable.

## Scope

This policy applies to prompt-like assets, including:

- `docs/research/RESEARCH_PROMPTS.md`
- `AGENT_TASKS.md`
- Agent/service prompt strings in `app/` and `lib/`

## Requirements

1. Every prompt/template change must be reviewed by at least one CODEOWNER.
2. Prompt changes that affect auth, payment, settlement, or incident workflows require one additional reviewer.
3. PR description must include:
   - reason for change
   - risk level (`low`, `medium`, `high`)
   - expected behavior change
4. If behavior changes in production flows, include:
   - test updates or new tests
   - rollback plan

## Review Checklist

- Does the prompt introduce broader permissions or weaker guardrails?
- Could this change alter payment verification, settlement routing, or auth decisions?
- Are outputs still deterministic enough for operational use?
- Are docs/tests updated to match new behavior?

## Emergency Path

For emergency production incidents, a prompt fix may merge with one approver, but a follow-up retrospective PR is required within 24 hours documenting:

- incident context
- diff summary
- post-fix validation
