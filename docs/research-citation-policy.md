# ArxMint Research Citation Policy

**Purpose:** Keep research-to-roadmap claims auditable and verifiable.

## Rules

1. Every externally sourced claim that drives roadmap priority must include at least one direct source URL.
2. Inference must be labeled explicitly as inference, not fact.
3. Placeholder citation tokens (for example `cite...`) are not acceptable in canonical planning docs.
4. If a source is time-sensitive (release status, protocol change), include an explicit date.

## Quality Gate

A research finding should not be marked `P0` or `P1` in `docs/research-crossref.md` unless:

- The claim is traceable to a URL in the originating research document, and
- The source can be opened independently by another reviewer.

## Current Cleanup Requirement

Legacy research documents under `internal/research` still contain unresolved placeholder citations. Before using those claims for production sign-off:

- Replace placeholders with direct URLs where possible.
- Mark unverifiable claims as provisional.
- Record unresolved citations as explicit TODO entries.
