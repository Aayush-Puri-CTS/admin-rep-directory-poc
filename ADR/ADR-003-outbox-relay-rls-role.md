# ADR-003 — Outbox Relay Cross-Tenant Discovery Under RLS

## Status

**Accepted** — reviewed; the interim tenant-iteration approach below was chosen over a dedicated
relay DB role.

| Sign-off required | Team | Status |
|---|---|---|
| Lead / Architect | Platform | ✅ Reviewed |
| DBA / Prisma reviewer | Platform | ✅ Reviewed |

This ADR will be revisited once the service has a real tenant registry (see **Revisit trigger**
below) — treat the decision here as scoped to "for the time being," not permanent.

---

## Date

2026-07-16 (drafted), 2026-07-17 (revised per review)

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

`OutboxRelayService.relay()` discovered unpublished events with a query that intentionally spans
**every** tenant in one poll:

```ts
const events = await this.prisma.client.outboxEvent.findMany({
  where: { publishedAt: null, retryCount: { lt: MAX_RETRIES } },
  ...
});
```

This ran outside `withTenantTransaction`, so `app.current_tenant_id` was unset on that connection.
`current_setting('app.current_tenant_id', true)` then returns `NULL` (the `true` argument
suppresses the "unset" error), so the policy's `USING` clause evaluates `"tenantId" = NULL` →
`NULL` → treated as `FALSE` for every row. The query silently returned an empty array on every
poll: no exception, no log line, no events ever published, for any tenant.

The app connects to Postgres as a single role that is also the table owner. Because
`FORCE ROW LEVEL SECURITY` is what makes RLS apply to that owning role at all (owners bypass RLS
by default without `FORCE`), removing `FORCE` from `outbox_events` would silently reopen an
owner-level bypass for every code path that touches that table — not just the relay. A single
connection with the Postgres `BYPASSRLS` attribute has the same problem: the app uses one
`DATABASE_URL` for both the request path and the relay, so granting `BYPASSRLS` would also
silently disable RLS enforcement for every tenant-scoped repository call made over that same
connection.

---

## Decision

An earlier draft of this ADR proposed a dedicated `outbox_relay` Postgres role with its own
additive policy (see **Alternatives considered**). On review, that was deferred in favor of a
simpler interim fix that ships without any new DB roles, grants, or secrets:

**The relay iterates over a known, configured list of tenant IDs, calling
`withTenantTransaction(tenantId, ...)` per tenant for both discovery and updates** — the same
mechanism every tenant-scoped repository already uses (see ADR-002), just invoked once per known
tenant instead of once per request.

```ts
private getKnownTenantIds(): string[] {
  return (process.env['OUTBOX_RELAY_TENANT_IDS'] ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

async relay(): Promise<void> {
  for (const tenantId of this.getKnownTenantIds()) {
    await this.relayForTenant(tenantId);
  }
}

private async relayForTenant(tenantId: string): Promise<void> {
  const events = await this.prisma.withTenantTransaction(tenantId, (tx) =>
    tx.outboxEvent.findMany({
      where: { publishedAt: null, retryCount: { lt: MAX_RETRIES } },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
    }),
  );
  // publish + per-event withTenantTransaction(tenantId, ...) update, as today
}
```

### Known tenant ID source (interim)

`OUTBOX_RELAY_TENANT_IDS` — a comma-separated env var listing every tenant this deployment serves.
This is a deliberately simple, manually-maintained stand-in for a real tenant registry, which this
service does not have (Tenant is a Keycloak realm reference, not a row in this database). It must
be updated whenever a tenant is onboarded or offboarded; there is no automatic discovery.

### Revisit trigger

Move to the dedicated-relay-role design (or a real tenant registry) once either becomes true:
tenant count/onboarding frequency makes manually maintaining `OUTBOX_RELAY_TENANT_IDS` error-prone,
or a tenant registry/directory is introduced elsewhere in the platform that this service could
read from instead of a static env var.

---

## Consequences

### Positive

- Ships immediately: no new Postgres role, no `GRANT`/policy DDL, no second `DATABASE_URL`/Prisma
  client, no DBA-provisioned secret.
- No change to the RLS posture for `app_rw`'s existing tenant-scoped path — the relay uses the
  exact same `withTenantTransaction` mechanism as every repository, just called in a loop.
- Zero risk of the widened-bypass failure modes of `BYPASSRLS` or un-forcing RLS: the relay never
  gains cross-tenant visibility in a single query — it only ever sees one tenant at a time, exactly
  like a request-scoped call.

### Negative / risks

- **Silent gap on missing entries**: a tenant not listed in `OUTBOX_RELAY_TENANT_IDS` will never
  have its events relayed, and nothing currently signals this — it looks identical to "no pending
  events." A stuck/misconfigured list fails exactly as silently as the original bug did, just moved
  from "forgot to scope a query" to "forgot to update a config value." Mitigation: log the known
  tenant count on each poll, and add an outbox-lag metric (count/max-age of unpublished rows) that
  would catch this even without per-tenant visibility into the gap.
- **O(N) queries per poll** where N is the number of known tenants, instead of 1 — fine at current
  scale, would need revisiting if tenant count grows significantly.
- **Manual maintenance burden**: `OUTBOX_RELAY_TENANT_IDS` must be kept in sync by hand; this is
  explicitly the trade-off accepted "for the time being" per the **Revisit trigger** above.

---

## Alternatives considered

| Option | Status |
|---|---|
| Dedicated `outbox_relay` Postgres role + additive `relay_cross_tenant` policy, second Prisma client on a separate `RELAY_DATABASE_URL` | **Deferred, not rejected.** More robust long-term (no manually-maintained tenant list, least-privilege role), but requires DBA-provisioned role/grants/secret before it can ship. Revisit per the trigger above. |
| Grant `BYPASSRLS` to the existing app role | Rejected — the app uses one connection/role for both the request path and the relay; this would silently disable RLS enforcement for every tenant-scoped query, not just the relay's scan. |
| Remove `FORCE ROW LEVEL SECURITY` from `outbox_events` | Rejected — since the app connects as the table owner, this reopens an owner-level bypass on that table for every code path, not just the relay. |

---

## Out of scope

CDC-based relay, per-tenant NATS streams, Group-level RLS. These are unrelated to the bug being
fixed here.
