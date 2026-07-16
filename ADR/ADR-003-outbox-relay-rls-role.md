# ADR-003 — Dedicated Outbox Relay DB Role for Cross-Tenant RLS Access

## Status

**Proposed** — pending Lead/Architect approval.
**Implementation is blocked until this ADR is Accepted** (Tier C/D — DB role and RLS posture
change; see `/ADR/ADR-002-rls-tenant-isolation.md` for the RLS model this builds on).

| Sign-off required | Team | Status |
|---|---|---|
| Lead / Architect | Platform | ⬜ Pending |
| DBA / Prisma reviewer | Platform | ⬜ Pending |

---

## Date

2026-07-16

## Author

Admin Application team

## Reference

Zoho Sprints — Automation project, item #17: "Fix outbox relay silently blocked by RLS —
dedicated relay DB role + policy" (Bug, High priority).

---

## Context

ADR-002 enabled and **forced** Row-Level Security on all 8 tenant-scoped tables, including
`outbox_events`, with a `tenant_isolation` policy:

```sql
CREATE POLICY tenant_isolation ON "outbox_events"
  USING ("tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));
```

`OutboxRelayService.relay()` discovers unpublished events with a query that intentionally spans
**every** tenant in one poll:

```ts
const events = await this.prisma.client.outboxEvent.findMany({
  where: { publishedAt: null, retryCount: { lt: MAX_RETRIES } },
  ...
});
```

This runs outside `withTenantTransaction`, so `app.current_tenant_id` is unset on that
connection. `current_setting('app.current_tenant_id', true)` then returns `NULL` (the `true`
argument suppresses the "unset" error), so the policy's `USING` clause evaluates
`"tenantId" = NULL` → `NULL` → treated as `FALSE` for every row. The query silently returns an
empty array on every poll: no exception, no log line, no events ever published, for any tenant.

The app currently connects to Postgres as a single role that is also the table owner. Because
`FORCE ROW LEVEL SECURITY` is what makes RLS apply to that owning role at all (owners bypass RLS
by default without `FORCE`), removing `FORCE` from `outbox_events` would silently reopen an
owner-level bypass for every code path that touches that table — not just the relay — undoing the
defense-in-depth guarantee ADR-002 exists to provide. A single connection with the Postgres
`BYPASSRLS` attribute has the same problem: the app uses one `DATABASE_URL` for both the request
path and the relay, so granting `BYPASSRLS` to make the relay's scan work would also silently
disable RLS enforcement for every tenant-scoped repository call made over that same connection.

---

## Decision

Introduce a three-role split at the database level, and give the relay its own narrowly-scoped
role instead of reusing the app's role or bypassing RLS wholesale:

1. **`owner`** — runs migrations only (CI / `prisma migrate deploy`). Never used by the running
   application.
2. **`app_rw`** — the existing application role, used for the request path (`PrismaService`'s
   current `DATABASE_URL`). Subject to `FORCE ROW LEVEL SECURITY` and `tenant_isolation` on all
   8 tables, unchanged from ADR-002.
3. **`outbox_relay`** — a new role granted `SELECT, UPDATE` on `outbox_events` only (no access to
   any other table), used exclusively by `OutboxRelayService`.

Add a second, additive policy scoped to that role — existing policies are untouched:

```sql
CREATE POLICY relay_cross_tenant ON outbox_events
  FOR ALL TO outbox_relay
  USING (true)
  WITH CHECK (true);
```

Postgres OR-combines multiple permissive policies for the same command, so `app_rw` continues to
see only its own tenant's rows via `tenant_isolation`, while `outbox_relay` — and only that role —
can see and update rows across all tenants.

Application-layer changes (not yet made — blocked on this ADR):

- A `RELAY_DATABASE_URL` secret (connects as `outbox_relay`) and a second Prisma client
  constructed from it, injected only into `OutboxRelayService`. `PrismaService` (the `app_rw`
  client) is not touched.
- `OutboxRelayService.relay()`'s discovery `findMany` moves to the relay client; the per-event
  `withTenantTransaction(event.tenantId, ...)` publish/retry calls added in the tenant-RLS-rollout
  PR are unaffected — they still run through the tenant-scoped path.
- An outbox-lag metric (count and max age of unpublished rows, queried via `outbox_relay`) with an
  alert above 5 minutes, so a silently-stuck relay is observable instead of invisible.
- A CLAUDE.md rule: code using the `RELAY_PRISMA` token may only touch `outbox_events`; everything
  else must go through the tenant-scoped `PrismaService`.
- Update the AI SDLC framework doc (§5.4 / Appendix A) to reflect shared-table + RLS in place of
  schema-per-tenant, matching the CLAUDE.md update already made in ADR-002's rollout.

---

## Consequences

### Positive

- Closes the silent-failure gap: the relay actually sees pending events across tenants again.
- `app_rw` never gains cross-tenant visibility — the new policy is scoped to a role nothing else
  uses, so RLS's defense-in-depth guarantee for the request path is untouched.
- The relay's DB privileges are minimal by construction (`SELECT, UPDATE` on one table) — a bug or
  compromise in the relay can't read or write anything else.
- Outbox lag becomes an observable, alertable metric instead of a silent zero.

### Negative / risks

- A second DB credential (`RELAY_DATABASE_URL`) to provision and rotate.
- `_prisma_migrations` and role/grant DDL for `outbox_relay` must be applied outside the normal
  Prisma migration flow (`GRANT`/`CREATE ROLE` are typically run by a DBA or a separate bootstrap
  script, not as an app-owned Prisma migration) — needs Platform/DBA involvement to provision in
  each environment, not just a code change.
- Two live Prisma clients in one process (`app_rw`, `outbox_relay`) is a new pattern for this
  codebase; needs a clear boundary (the CLAUDE.md rule above) so it doesn't become an easy way to
  accidentally bypass tenant scoping elsewhere.

---

## Alternatives considered

| Option | Rejected because |
|---|---|
| Grant `BYPASSRLS` to the existing app role | The app uses one connection/role for both the request path and the relay; this would silently disable RLS enforcement for every tenant-scoped query, not just the relay's scan — defeats ADR-002 entirely. |
| Remove `FORCE ROW LEVEL SECURITY` from `outbox_events` | Since the app connects as the table owner, this reopens an owner-level bypass on that table for every code path, not just the relay — same defense-in-depth loss as the option above, just table-scoped instead of role-scoped. |
| Have the relay iterate over a known list of tenant IDs, calling `withTenantTransaction` per tenant | Requires a tenant registry/directory this service doesn't have (Tenant is a Keycloak realm reference, not a row in this database) — would need to be built and kept in sync from another source of truth; also turns one query into N per poll. |

---

## Out of scope

CDC-based relay, per-tenant NATS streams, Group-level RLS. These are unrelated to the bug being
fixed here.
