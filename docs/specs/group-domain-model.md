# Spec: Group Domain Model

- **Branch:** `task/group-domain-model`
- **Rollback point (starting SHA):** `a49f020`
- **Feature tier:** B (new domain entity + VOs; no infra/schema/handler/event-contract changes)
- **Blocked by:** — · **Blocks:** Tickets 2, 7
- **Reference:** `docs/reference/group-directory-matrix-extract.csv`, mirrors Phase 1 Rep
  (`src/domain/entities/rep.entity.ts` and `src/domain/value-objects/rep-*`)

## Scope

Domain layer only. Create the `Group` entity (a Party with role `EMPLOYER`) and its value
objects, mirroring the Rep entity's structure.

### Out of scope (do NOT touch in this ticket)

- `infrastructure/` — no Prisma schema, migrations, or outbox
- `adapters/` — no controllers, consumers, repositories, or NATS publishers
- `application/` — no command/query handlers
- Any NATS event **contract** definition. The entity may accumulate in-memory domain events
  mirroring `RepDomainEvent` (a plain in-process structure, not a published schema), but no
  event is published and no external contract is declared here — that keeps this Tier B.

## Hard-rule checkpoints

- **Rule 5 (hexagonal boundary):** every file must have zero imports from `infrastructure/` or
  `adapters/`. Verifier must grep-assert this.
- **Rule 4 (Tenant != Group):** Group is an Employer Party inside one tenant's schema. No
  "tenant scoping" language or `tenant_id` logic belongs in this domain code.

## Decisions

- **No shared `ContactInfo` VO exists** in the codebase (`RepPersonalInfo` is Rep-specific,
  carrying `ssn`/`dateOfBirth`/`num800`). Per ticket instruction, since none exists,
  `GroupContact` is created new.

## Tasks

### Task 1 - `GroupId` value object · Tier B
- File: `src/domain/value-objects/group-id.vo.ts`
- Mirror `rep-id.vo.ts`: private ctor, static `of(value)`, trim + non-empty guard, `equals`,
  `toString`.
- Acceptance: `of('')`/whitespace throws; `of(' g1 ')` trims to `g1`; `equals` compares by
  value; zero infra/adapter imports.
- Tests: `src/domain/value-objects/group-id.vo.spec.ts` (mirror `rep-id.vo.spec.ts`).

### Task 2 - `GroupProfile` value object · Tier B
- File: `src/domain/value-objects/group-profile.vo.ts`
- Fields (matrix "Update Group Details"): `groupName` (required), `groupCode`, `taxId`,
  `industry`, `type`.
- Mirror `RepBusinessInfo`: props interface + private ctor + static `create()`; trim +
  required guard on `groupName`; readonly fields.
- Tests: `group-profile.vo.spec.ts` covering required-field validation and trimming.

### Task 3 - `GroupContact` value object · Tier B
- File: `src/domain/value-objects/group-contact.vo.ts`
- Fields (matrix "Update Group Details"): `firstName`, `lastName`, `email`, `phone`, `fax`.
- New VO (no shared `ContactInfo` exists). Required set: `firstName`, `lastName`, `email`;
  `phone`, `fax` optional. Zero infra/adapter imports.
- Tests: `group-contact.vo.spec.ts`.

### Task 4 - `GroupStatus` enum · Tier B · **BLOCKED - human sign-off required**
- File: `src/domain/value-objects/group-status.ts`
- HELD: matrix exposes `status`/`groupStatus` only as opaque fields; exact enum values and
  allowed transitions are NOT confirmed. Ticket says "get sign-off before implementing, don't
  guess"; acceptance requires values "confirmed by a human, not inferred." Do NOT dispatch
  until the human provides the enum values + transition map.

### Task 5 - `Group` entity · Tier B · depends on Task 4 sign-off
- File: `src/domain/entities/group.entity.ts`
- Mirror `rep.entity.ts`: `GroupProps`/`CreateGroupProps`, private ctor,
  `create()`/`reconstitute()`, getters, in-memory `GroupDomainEvent` + `clearDomainEvents()`,
  `touch()`. Composes `GroupId`, `GroupProfile`, `GroupContact`, `GroupStatus`.
- Status-transition methods implement ONLY the transitions confirmed in Task 4 - no guessed
  states.
- Acceptance: compiles with zero infra/adapter imports; unit tests cover every `GroupStatus`
  transition (valid + invalid guards); `create()` sets confirmed initial status.
- Tests: `src/domain/entities/group.entity.spec.ts`.

## Feature-level acceptance criteria (from ticket)

- [ ] Entity + VOs compile with zero imports from `infrastructure/` or `adapters/`
- [ ] Unit tests cover every `GroupStatus` transition
- [ ] `GroupStatus` enum values confirmed by a human, not inferred
- [ ] `pnpm lint` and `pnpm test` pass locally
- [ ] PR states tier classification (B); `ai-assisted` label applied

## Execution order

Task 1 -> 2 -> 3 may proceed now (sequential implement -> verify -> commit-per-file).
Task 4 -> 5 are GATED on human sign-off of the `GroupStatus` enum.

## GroupStatus sign-off (HUMAN-CONFIRMED)

Confirmed by repo owner on 2026-07-22 (reply "approve as is") — NOT inferred.

**Enum values:** `PENDING`, `ACTIVE`, `SUSPENDED`, `SOFT_DELETED`
- No renewal state (`PENDING_RENEWAL`/`EXPIRED`) — explicitly out of scope for this ticket.
- Literal is `PENDING` (not `PENDING_APPROVAL`).

**Allowed transitions:**
- `create()` -> `PENDING`
- `approve()`: `PENDING` | `SUSPENDED` -> `ACTIVE`
- `suspend()`: `ACTIVE` -> `SUSPENDED`
- `softDelete()`: `ACTIVE` | `SUSPENDED` -> `SOFT_DELETED` (NOT from `PENDING`)
- `restore()`: `SOFT_DELETED` -> `ACTIVE`

Tasks 4 and 5 are unblocked as of this sign-off.
