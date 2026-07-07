# Code Review Guidelines — Admin Application

## What to skip

Do not spend review cycles on:

- **Test files** (`*.spec.ts`, `test/**`) — test structure and naming are the author's call; review only if a test is clearly wrong (wrong assertion, wrong subject under test).
- **Generated files** — `prisma/generated/`, `dist/`, `*.tsbuildinfo` should never appear in a PR; if they do, flag it and stop.
- **Formatting / whitespace** — ESLint + Prettier enforce this automatically; style nits in review are noise.
- **Boilerplate** — stub files, index re-exports, `test.todo()` placeholders.
- **Comment volume** — the convention is minimal comments; don't request more.

---

## Always check — non-negotiable

These map directly to the hard rules in `CLAUDE.md`. A PR that violates any of these must not merge regardless of tier.

### 1. Tenant isolation
- Tenant context must be resolved from the platform-injected `X-Tenant-Id` header/JWT claim only.
- Reject any code that accepts a tenant identifier from a request body, query parameter, path segment, or hardcoded literal.

### 2. Group scoping
- Any query scoped to "members of a Group" must filter by `groupId` — a missing filter is a blocking defect.
- General member/directory queries must not assume `groupId` is present; they must handle a null/absent Group relationship without erroring or silently dropping records.
- Don't conflate Tenant and Group. Tenant = separate Keycloak realm + DB schema. Group = an Employer `Party` inside one tenant's schema.

### 3. Hexagonal boundary
- `domain/` and `application/` must never import from `infrastructure/` or `adapters/`.
- Ports belong in `domain`/`application`; adapters implement them. If domain code reaches into infrastructure, the port is missing — reject and request the port.

### 4. Transactional outbox
- Domain events must never be published directly from a command handler.
- Events must be written to `infrastructure/outbox/` in the same transaction as the data change.

### 5. No live data
- No connection strings, credentials, or queries against real customer/member data — not even via exports or pasted results.

---

## Tier-specific gates

Check `CLAUDE.md § Autonomy tiers` for the full table. Quick reference:

| Tier | Gate before merge |
|------|-------------------|
| A | Standard CI + standard review |
| B | Standard PR review tier |
| C | Standard + a reviewer with DB/Prisma familiarity |
| D | Separate Lead/Architect approval + ADR merged first |
| E | No AI access — escalate to a human |

**Prisma schema / migration changes are Tier C.** Verify a DB/Prisma-familiar reviewer is listed.

**New or changed NATS event contracts are Tier D.** Verify the ADR is merged and signed off before reviewing the implementation.

---

## PR checklist (run in order)

- [ ] PR description states the autonomy tier
- [ ] `ai-assisted` label applied if Claude Code contributed
- [ ] `pnpm lint && pnpm test` passed locally (author's responsibility — don't approve if CI is the first gate)
- [ ] Hard rules above all pass
- [ ] Correct tier gate satisfied (DB reviewer present for Tier C, ADR merged for Tier D)
- [ ] No `package-lock.json` or `yarn.lock` introduced — this repo uses pnpm
- [ ] No `.env` or secrets in diff
- [ ] Prisma migration is additive and backward-compatible with the running application (for Tier C)

---

## General guidelines

**Focus on correctness and contracts, not style.**
Style is the linter's job. Review for: wrong behavior, violated invariants, missing error handling at system boundaries (user input, external APIs), and incorrect domain modelling.

**One concern per comment.**
Batch nits into a single summary comment rather than ten separate threads. Reserve individual threads for blocking issues.

**Distinguish blocking from non-blocking.**
Prefix non-blocking suggestions with `nit:` or `optional:`. A reviewer who only leaves blocking comments makes the intent of each comment clear.

**Domain layer reviews need domain context.**
When reviewing `domain/entities/` or `domain/value-objects/`, check that state machine transitions are exhaustive, that invariants are enforced in the constructor/factory (not scattered across callers), and that domain events are raised for every meaningful state change.

**For Prisma migrations (Tier C):**
- Column removals or renames require a two-phase migration (add → dual-write → remove).
- Index additions on large tables need a `CONCURRENTLY` plan — flag if missing.
- `onDelete: Cascade` choices must be intentional; verify with the author.

**For NATS event contracts (Tier D):**
- Review the ADR, not just the code — the ADR is the contract.
- Confirm the consuming teams listed in the ADR have signed off before the implementation PR is opened.
