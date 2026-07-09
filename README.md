# Admin Application — Rep Directory Service

The **write model** for the Party-Role/Party-Relationship core directory (Reps, Groups/Employers) and the **read model** for back-office aggregated views. This service owns Rep lifecycle management — creation, personal/business info, platform access control, soft-delete/restore, and Rep↔Group relationship management — and emits domain events over NATS for downstream consumers (Plan Selection, Enrollment, Invoicing, Commissions).

This is a backend-only service. The frontend lives in a separate repo.

---

## Table of contents

1. [Architecture](#architecture)
2. [Tech stack](#tech-stack)
3. [Getting started](#getting-started)
4. [Running the server](#running-the-server)
5. [API & Swagger docs](#api--swagger-docs)
6. [Development commands](#development-commands)
7. [AI SDLC framework](#ai-sdlc-framework)
8. [Dependency-cruiser — architecture boundary enforcement](#dependency-cruiser--architecture-boundary-enforcement)
9. [Zoho Sprints MCP with Claude Code](#zoho-sprints-mcp-with-claude-code)

---

## Architecture

The service follows **hexagonal architecture** (ports and adapters) with **tactical DDD** and **CQRS**.

```
src/
├── app.module.ts               # Composition root — wires all modules; not inside a layer
├── main.ts                     # NestJS bootstrap + Swagger setup
├── domain/                     # Pure business logic — no framework, no I/O
│   ├── entities/               # Aggregates (Rep, PartyRelationship)
│   ├── value-objects/          # RepId, RepPersonalInfo, AccessControl, …
│   └── ports/                  # Repository interfaces defined by the domain
├── application/
│   ├── commands/               # CQRS write-side handlers
│   └── queries/                # CQRS read-side handlers + read-model port
├── adapters/
│   ├── driving/http/           # NestJS controllers + request/response DTOs
│   └── driven/prisma/          # Prisma repository implementations
│   └── driven/nats/            # NATS event publisher
├── infrastructure/
│   ├── outbox/                 # Transactional outbox + relay service
│   ├── prisma/                 # PrismaService (connection management)
│   └── config/                 # App config, env validation
└── prisma/
    ├── schema.prisma
    └── migrations/
```

**Boundary rule (enforced by dep-cruiser and CI):** `domain/` and `application/` never import from `infrastructure/` or `adapters/`. The composition root (`app.module.ts`) sits at `src/` — outside any layer — so it can wire everything together without violating the rule.

Domain events are written to an `outbox_events` table in the **same transaction** as the aggregate save. `OutboxRelayService` polls the table and publishes to NATS. See [`/ADR/ADR-001-nats-event-contract.md`](./ADR/ADR-001-nats-event-contract.md) for the full NATS subject map and payload schemas.

---

## Tech stack

| Concern | Choice |
|---|---|
| Language / runtime | TypeScript, Node.js ≥ 20 |
| HTTP framework | NestJS 11 |
| ORM | Prisma 7 (driver adapter: `@prisma/adapter-pg`) |
| Database | PostgreSQL |
| Messaging | NATS |
| Package manager | **pnpm** — never `npm` or `yarn` |
| Test runner | Jest |
| Linter | ESLint (`@typescript-eslint/recommended`) |
| Arch enforcement | dependency-cruiser |
| API docs | `@nestjs/swagger` — Swagger UI at `/api/docs` |

---

## Getting started

### Prerequisites

- Node.js ≥ 20
- pnpm (`npm i -g pnpm`)
- Docker (for PostgreSQL and NATS)

### 1 — Start infrastructure

```bash
docker run -d --name postgres-db -e POSTGRES_DB=admin_poc -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:latest

docker run -d --name nats -p 4222:4222 -p 8222:8222 nats:2.10-alpine
```

### 2 — Configure environment

```bash
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL and NATS_URL
```

`.env.example` minimum:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/admin_poc
NATS_URL=nats://localhost:4222
PORT=3000
```

### 3 — Install dependencies and run migrations

```bash
pnpm install
pnpm exec prisma migrate dev
```

### 4 — Generate Prisma client

```bash
pnpm exec prisma generate
```

---

## Running the server

```bash
pnpm build
node dist/main.js
```

`@nestjs/config` with `ConfigModule.forRoot()` auto-loads `.env` at startup — no `--env-file` flag needed.

Compiled output lands at `dist/main.js` (not `dist/src/main.js`) because `tsconfig.json` sets `rootDir: "./src"`.

---

## API & Swagger docs

Once running, open **[http://localhost:3000/api/docs](http://localhost:3000/api/docs)** for the interactive Swagger UI.

### Rep endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/reps` | Create a Rep (server-generates `repId`) |
| `GET` | `/reps` | Paginated directory (`?page=1&pageSize=20`) |
| `GET` | `/reps/search` | Filter by `name`, `email`, `status`, `repType`, `businessName` |
| `GET` | `/reps/:repId` | Get Rep detail with platform access |
| `PATCH` | `/reps/:repId/personal-info` | Replace personal info |
| `PATCH` | `/reps/:repId/business-info` | Replace business info (`null` to remove) |
| `PATCH` | `/reps/:repId/access-control` | Replace all platform access entries |
| `DELETE` | `/reps/:repId` | Soft-delete (data retained, recoverable) |
| `POST` | `/reps/:repId/restore` | Restore from `SOFT_DELETED` |
| `POST` | `/reps/:repId/groups` | Link Rep to a Group (Employer) |
| `GET` | `/reps/:repId/groups` | List Groups serviced by a Rep |

All write operations emit domain events via the transactional outbox → NATS.

---

## Development commands

```bash
pnpm lint                          # ESLint
pnpm test                          # Jest (all suites)
pnpm build                         # tsc

pnpm arch:check                    # dependency-cruiser boundary check (exits 1 on violation)
pnpm arch:report                   # generate depcruise-report.html

pnpm exec prisma generate          # regenerate Prisma client after schema change
pnpm exec prisma validate          # check schema syntax (no DB connection needed)
pnpm exec prisma migrate dev       # create + apply a migration (dev only)
pnpm exec prisma migrate deploy    # apply pending migrations (CI / production)
```

**Commit convention:** one commit per file, message format `(task-name): description`.

**PR convention:** title `type(scope): description`, always add the `ai-assisted` label for Claude Code contributions, state the autonomy tier in the PR body.

---

## AI SDLC framework

This repo uses a structured **AI SDLC framework** that governs how Claude Code participates in the development lifecycle. The goal is to get the speed of AI-assisted coding without losing the safety guarantees of human review, architecture enforcement, and controlled blast radius.

### How it works

Claude Code operates inside a set of hard constraints loaded from [`CLAUDE.md`](./CLAUDE.md) at the start of every session:

- **Hard rules** (never violated regardless of task): no live data access, no hardcoded tenant context, Group vs. Tenant distinction, hexagonal boundary direction.
- **Autonomy tiers** (checked before starting any task):

  | Tier | Meaning | Examples |
  |---|---|---|
  | A | Standard CI + standard review | Tests, boilerplate, mechanical refactors |
  | B | Existing PR review tier | New handlers, entities, endpoints |
  | C | Standard + DB/Prisma-familiar reviewer | Schema changes, migrations, outbox, new adapters |
  | D | Separate approval required before code review | New/changed NATS event contracts, architectural changes |
  | E | No AI access | Production data, secrets, deployment execution |

- **Permission allowlist/denylist** in `.claude/settings.json` — Claude Code cannot run `npm install`, `yarn`, `psql`, `aws`, `ssh`, or access `.env` files. Prisma migrations, NATS adapter writes, and `git push` all require human confirmation before executing.

### Verification loop

A `PostToolUse` hook (`.claude/hooks/verify-loop.sh`) runs automatically after every file edit:

1. Runs ESLint on the changed file.
2. If a co-located `.spec.ts` exists, runs Jest on it.
3. Failures are fed back to Claude Code as a blocking error — it must self-correct before moving on.
4. After **3 consecutive failures** on the same file the loop stops and flags the change for human review instead of retrying indefinitely.

### Event contracts (Tier D)

New or changed NATS event schemas require an ADR (in `/ADR/`) reviewed and approved by leads and affected consuming teams **before** implementation starts. See [`ADR-001`](./ADR/ADR-001-nats-event-contract.md) for the current Rep event contract.

### In practice

Every PR opened by Claude Code carries the `ai-assisted` label, states its autonomy tier, and has had `pnpm lint && pnpm test` pass locally before the PR is opened. The architecture boundary check (`pnpm arch:check`) also runs locally and in CI before merge.

---

## Dependency-cruiser — architecture boundary enforcement

[dependency-cruiser](https://github.com/sverweij/dependency-cruiser) statically analyses the TypeScript import graph and fails the build if any of the hexagonal boundary rules are violated.

### Rules enforced

| Rule | What it prevents |
|---|---|
| `no-domain-to-infrastructure` | `domain/` importing from `infrastructure/` |
| `no-domain-to-adapters` | `domain/` importing from `adapters/` |
| `no-application-to-infrastructure` | `application/` importing from `infrastructure/` |
| `no-application-to-adapters` | `application/` importing from `adapters/` |
| `no-infrastructure-to-adapters` | `infrastructure/` importing from `adapters/` |
| `no-circular` | Circular dependencies (warning, not error) |

Configuration lives in [`.dependency-cruiser.js`](./.dependency-cruiser.js).

### Running locally

```bash
# Check for violations (exits 1 if any error-severity rule fires)
pnpm arch:check

# Generate an HTML report you can open in a browser
pnpm arch:report
open depcruise-report.html
```

### CI

A GitHub Actions workflow (`.github/workflows/arch-check.yml`) runs `pnpm arch:check` on every push and PR to `main`. A failing boundary check blocks merge.

### When you hit a violation

The error output names the offending file and the rule:

```
error no-infrastructure-to-adapters: src/infrastructure/modules/app.module.ts → src/adapters/driving/http/rep.module.ts
```

The correct fix is almost always architectural — not relaxing the rule. Common resolutions:

- **Composition root importing an adapter module** → move the file to `src/` (outside all layers), as `app.module.ts` is.
- **Domain code needing a service** → the port is missing; define it in `domain/ports/` and let `infrastructure/` implement it.
- **Application handler calling a repository directly** → wire it through a port, not the concrete class.

---

## Zoho Sprints MCP with Claude Code

The team uses the **Zoho Sprints MCP** to give Claude Code live access to sprint items, epics, and project details — so it can reference tickets when implementing features without leaving the terminal.

### How the connection works

The Zoho Sprints MCP is a **remote MCP server hosted on claude.ai** (not a locally configured server). It authenticates via OAuth through the claude.ai interface and is injected into Claude Code sessions automatically once connected.

### Connecting (one-time setup)

1. Open [claude.ai](https://claude.ai) in your browser and sign in.
2. Go to **Settings → Integrations** (or **Connections**, depending on your plan).
3. Find **Zoho Sprints** in the available integrations list and click **Connect**.
4. You will be redirected to Zoho OAuth — sign in with your Zoho account and grant the requested scopes (`ZohoSprints.sprints.READ`, `ZohoSprints.projects.READ`, etc.).
5. After authorisation, the integration status shows **Connected**.

### Using it in Claude Code

Once connected on claude.ai, the MCP tools are automatically available in every Claude Code session — no local configuration needed.

Example prompts:

```
# Pull up a sprint item before starting work
"Check ZI-142 in Zoho Sprints and implement the described endpoint"

# List open items in the current sprint
"What items are in the active sprint for this project?"

# Get epic context before a larger task
"Summarise the epic for the Rep Directory feature so I understand the scope"
```

Available tool categories (all read-only):

| Category | What it surfaces |
|---|---|
| Projects | Project list and details |
| Sprints | Sprint list, details, comments |
| Items | Sprint items, item details, activity, comments, linked items |
| Epics | Epic list, details, associated sprints and items |
| Log Hours | Time tracking entries |

> **Read-only:** the MCP exposes read operations only. Creating or updating items still requires the Zoho Sprints web UI.

### Troubleshooting

| Symptom | Fix |
|---|---|
| Tools not appearing in Claude Code | Confirm the integration shows **Connected** on claude.ai; re-authenticate if the OAuth token has expired |
| `Authentication required` error mid-session | The OAuth token expired — reconnect via claude.ai Settings → Integrations |
| Tools appear but return empty results | Check that your Zoho account has access to the target portal and project |
