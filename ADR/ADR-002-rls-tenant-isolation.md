# ADR-002 — Row-Level Security for Tenant Isolation (replacing schema-per-tenant)

## Status

**Proposed** — pending Lead/Architect approval.
**Implementation is blocked until this ADR is Accepted.**

| Sign-off required | Team | Status |
|---|---|---|
| Lead / Architect | Platform | ⬜ Pending |
| DBA / Prisma reviewer | Platform | ⬜ Pending |

---

## Context

The original architecture document stated that tenant isolation would be structural: **a separate PostgreSQL schema per tenant**, provisioned by the platform team. The Admin Application was explicitly told it did not need to implement per-query tenant filtering — the schema boundary would enforce it.

That approach has been revisited. The new direction is:

- **Shared tables** across all tenants in a single PostgreSQL schema
- **Row-Level Security (RLS)** policies on every tenant-scoped table, filtering on a `tenant_id` column
- The application sets the active tenant via `SET LOCAL app.current_tenant_id = '<id>'` at the start of every transaction; the RLS policy enforces it transparently from that point

---

## Decision

Move from schema-per-tenant to shared tables + RLS:

1. **Add `tenant_id` column** (non-nullable `String`) to every tenant-scoped table: `reps`, `rep_platform_access`, `rep_addresses`, `rep_licenses`, `rep_documents`, `rep_administrator_users`, `party_relationships`, `outbox_events`.
2. **Enable RLS** on each table with `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY`.
3. **Create a `USING` policy** on each table: `tenant_id = current_setting('app.current_tenant_id', true)`.
4. **Set the tenant context** at the start of every DB transaction via `SET LOCAL app.current_tenant_id = '<tenantId>'`. The value is sourced exclusively from the `X-Tenant-Id` request header, which the platform Lambda Authorizer populates from the JWT issuer claim — never from a request body or query string.
5. The `OutboxRelayService` must set the tenant context when re-publishing events; the `tenant_id` stored in `outbox_events` provides the value.

### What does NOT change

- The tenant identifier still comes only from `X-Tenant-Id` (Lambda Authorizer → JWT issuer → header). No request-body or query-string tenant identifiers are accepted.
- Group isolation (filtering by `groupId` within a tenant) is still the application's responsibility — RLS handles cross-tenant isolation only.
- The distinction between Tenant and Group in the domain model is unchanged.

---

## Implementation plan

### Phase 1 — Schema migration (Tier C, blocked on this ADR)

- Add `tenant_id` column to all tenant-scoped tables (nullable in migration, non-nullable via constraint after backfill in dev).
- `CREATE INDEX` on `tenant_id` for each table.
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for each table.
- `CREATE POLICY tenant_isolation ON <table> USING (tenant_id = current_setting('app.current_tenant_id', true))` for each table.
- `ALTER TABLE ... FORCE ROW LEVEL SECURITY` so the table owner is also subject to RLS (prevents accidental bypass in superuser sessions used by migrations).

### Phase 2 — Application layer (Tier C, blocked on Phase 1 merge)

- **`TenantContext`** — `AsyncLocalStorage`-backed singleton in `infrastructure/tenant/`; stores the active `tenantId` for the current async call chain.
- **`TenantMiddleware`** (driving adapter) — reads `X-Tenant-Id` header; runs the rest of the request inside `tenantStorage.run(tenantId, next)`. Returns `400` if the header is absent.
- **`PrismaService`** — updated to expose `withTenantTransaction(fn)`: opens a transaction, executes `SET LOCAL app.current_tenant_id`, then calls `fn(tx)`.
- **`OutboxRelayService`** — updated to call `withTenantTransaction` using the `tenant_id` stored on each outbox row.
- All `PrismaRepRepository` and `PrismaPartyRelationshipRepository` calls moved to `withTenantTransaction`.

### Phase 3 — Remove schema-per-tenant provisioning references (Tier D, blocked on Phase 2)

- Remove language in CLAUDE.md and docs referring to separate schemas.
- Coordinate with Platform team to stop provisioning per-tenant schemas for this service.

---

## Consequences

### Positive

- Single schema means Prisma migrations are simpler — one migration applies to all tenants instead of per-tenant schema management.
- RLS is enforced by PostgreSQL itself; a bug in application-layer filtering cannot expose cross-tenant data.
- Easier to query across tenants for admin/ops tooling (by connecting as the superuser, bypassing RLS).

### Negative / risks

- RLS adds a small per-row overhead on every query. Benchmark under representative load before production rollout.
- Requires `SET LOCAL app.current_tenant_id` in every transaction — missing it means RLS returns 0 rows (silent failure) or errors depending on the `current_setting` strict mode. Integration tests must cover the "no tenant set" path.
- Connection pooling (PgBouncer in transaction mode) is compatible with `SET LOCAL` but NOT with `SET` (session-level). Ensure the pool is configured in transaction mode.
- `outbox_events` now requires a `tenant_id` column so the relay service can set the correct RLS context on re-publish. Missing this means published events see 0 outbox rows.

---

## Alternatives considered

| Option | Rejected because |
|---|---|
| Schema-per-tenant (current) | Operational complexity: every new tenant requires schema provisioning, Prisma migration per schema, and connection routing per schema. Doesn't scale. |
| Application-layer `WHERE tenant_id = ?` on every query | Prone to developer error — a single missing clause exposes all tenants' data. RLS provides a defense-in-depth guarantee at the DB layer. |
| Separate database per tenant | Higher cost, more complex connection management, no advantage over RLS for this service's scale. |
