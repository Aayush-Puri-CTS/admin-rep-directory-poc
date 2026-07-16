# CLAUDE.md — Admin Application

This file is loaded automatically at the start of every Claude Code session in this repo. It
encodes the AI SDLC framework's hard rules and conventions so they don't have to be re-explained
per session. See `/ADR` for the framework itself; this file is the operational summary.

## What this service is

We own the **Admin Application** — the Party-Role/Party-Relationship core directory (Reps,
Customers, Groups/Employers) and the aggregated back-office dashboards. We are the **write model**
for directory data (we emit domain events) and the **read model** for cross-team aggregated views
(we consume events from Plan Selection, Enrollment, Invoicing, Payments, Commissions — we do not
own those domains).

## Tech stack & commands

Stated explicitly so Claude Code doesn't have to infer it from `package.json` every session, and so
it matches what `.claude/settings.json` and `.claude/hooks/verify-loop.sh` already assume.

- **Language/runtime:** TypeScript on Node.js `>20`
- **Backend framework:** NestJS
- **Frontend:** React, in a **separate repo** — this repo is backend-only; no frontend code, build
  tooling, or dependencies belong here
- **Database:** PostgreSQL, accessed via Prisma ORM
- **Messaging:** NATS (event bus between services)
- **Package manager:** **pnpm** — never `npm install` or `yarn add`; use `pnpm add` / `pnpm install`. Claude Code should not add or modify a `package-lock.json` or `yarn.lock` in this repo.
- **Test runner:** `[confirm — settings.json/hook assume Jest]`
- **Lint/format:** `[confirm — settings.json/hook assume ESLint; note Prettier or other tooling if used]`

**Exact commands** (fill in the remaining two from `package.json` — these must match
`.claude/settings.json`'s allowlist and `verify-loop.sh`'s `LINT_CMD`/`TEST_CMD` exactly, or the
hook silently no-ops):

- Lint: `pnpm lint`
- Test: `pnpm test`
- Build: `pnpm build`
- Prisma: `pnpm exec prisma generate` / `pnpm exec prisma validate` / `pnpm exec prisma migrate dev`

If any of the above is wrong for this repo, fix it here first — the permission rules and the
verification hook were written to match these assumptions, not the other way around.

Never hand-write `migration.sql`: run `prisma migrate dev --create-only` to let Prisma diff
`schema.prisma` and generate it, then manually append only what Prisma can't generate — RLS
policies and backfills for new required columns.

## Hard rules — never violate these

1. **No live data access.** Never connect, directly or via MCP, to a database or system containing
   real customer/member records. Operate on source code, local commands, and synthetic/seed data
   only. If a task seems to require live data, stop and ask a human — do not proxy around this via
   exports, logs, or pasted query results.
2. **Tenant context is never hardcoded.** Tenant isolation uses **shared tables + PostgreSQL
   Row-Level Security** — every tenant-scoped table has a `tenant_id` column and an RLS policy
   (`tenant_id = current_setting('app.current_tenant_id', true)`). The application sets the active
   tenant via `SET LOCAL app.current_tenant_id = '<id>'` at the start of every transaction using
   `PrismaService.withTenantTransaction()`. Generated code must always resolve the tenant ID from
   the platform-injected header/claim (`X-Tenant-Id`, resolved by the Lambda Authorizer from the
   JWT issuer) via `TenantContext`. Never accept a tenant identifier from a request parameter, query
   string, or literal. See ADR-002 for the full design.
3. **Group-scoped queries filter by `groupId`; not every Member has one.** `MEMBER_OF_GROUP` is an
   _optional_ `PartyRelationship` — present for Members enrolled under an employer/Group, absent
   for Members who enrolled independently through a Rep with no Group involved. The Rep↔Member
   relationship (mediating enrollment) is the one every enrolled Member has; Group is not.
   Groups (Employers) are business entities _within_ one tenant's schema — there is no schema
   boundary protecting Group A's data from Group B's, only an explicit filter traced through the
   `PartyRelationship` graph. Any query explicitly scoped to "members of this Group" must filter by
   `groupId`; treat a missing filter there as a blocking defect, not a style nit. But a general
   Member list, search, or directory query must not assume `groupId` is present — it must handle a
   null/absent Group relationship without erroring or silently dropping independent Members.
4. **Don't confuse Tenant and Group.** Tenant = separate platform client (own Keycloak realm,
   isolated via `tenant_id` + RLS). Group = an Employer, modeled as a `Party` with role
   `EMPLOYER`/`GROUP_ADMIN`, living inside one
   tenant's schema. If you're about to write "tenant scoping" for Group-level logic, it's the wrong
   term — check whether you actually mean Group isolation instead.
5. **Hexagonal boundary is one-directional.** `domain/` and `application/` never import from
   `infrastructure/` or `adapters/`. Ports are defined in `domain`/`application`; adapters implement
   them. If a task seems to require domain code to reach into infrastructure, the port is missing —
   add the port, don't skip the boundary.

## Repo conventions

- `adapters/driving/` — inbound (HTTP controllers, message consumers)
- `adapters/driven/` — outbound (Prisma repository implementations, NATS publishers)
- `application/commands/`, `application/queries/` — CQRS handlers
- `domain/entities/`, `domain/value-objects/` — tactical DDD building blocks
- `infrastructure/outbox/` — transactional outbox; events are written in the _same_ transaction as
  the data change, never published directly from a command handler
- `infrastructure/prisma/` — Prisma schema, migrations, generated client
- `/ADR/` — architecture decision records; required before any Tier D change proceeds

## Autonomy tiers — check before you start a task

| Tier | Meaning                                               | Examples                                                             |
| ---- | ----------------------------------------------------- | -------------------------------------------------------------------- |
| A    | Standard CI + standard review                         | test scaffolding, boilerplate, mechanical refactors                  |
| B    | Existing PR review tier applies                       | new command/query handlers, entities, endpoints                      |
| C    | Standard tier + a reviewer with DB/Prisma familiarity | Prisma schema/migrations, `infrastructure/outbox`, new adapters      |
| D    | Cannot enter code review until separately approved    | new/changed NATS event contract, architecturally significant changes |
| E    | No AI access                                          | production data, secrets, deployment execution                       |

If you're not sure which tier a task falls under, say so explicitly in the PR description rather
than guessing — Tier C/D changes need a specific reviewer, not just "someone."

## Event contracts (Tier D)

A new or changed NATS event schema is a dependency other teams rely on. Before writing
implementation code:

1. Draft an ADR describing the change and why
2. Flag it for Lead/Architect review
3. Note in the ADR which consuming teams need to sign off
4. Do not proceed to implementation until the ADR is approved

Prisma schema/migration changes are Tier C, not Tier D — no new ADR/branch mechanics required, just
flag it clearly for a DB/Prisma-familiar reviewer in addition to the standard reviewer.

## Commit convention

- Create separate commits per file change, clearly mentioning what has been changed/implemented/refactored
- Commit message format ( (task-name): commit msg )

## PR conventions

- Title following branch naming format (e.g. feat(NUE-19426): implement theme fetching)
- Every PR with Claude Code contribution gets the `ai-assisted` label
- State the tier in the PR description
- Local `pnpm lint && pnpm test` must pass before opening the PR — don't rely on CI to catch what
  local checks would have caught

## Verification loop

A `PostToolUse` hook runs lint + relevant tests automatically after file edits (see
`.claude/settings.json` and `.claude/hooks/verify-loop.sh`). If it reports failures, fix them in the
same session before moving on. After 3 failed self-correction attempts on the same file, the hook
stops blocking and flags the change for human review instead — treat that as a signal the approach
needs a person, not a reason to keep retrying with small variations.

## Continuous improvement

Recurring review-comment patterns (not one-off mistakes) belong in this file, not just in PR
comments. If you notice the same class of correction happening repeatedly, propose an addition here
rather than relying on every future session rediscovering it.
