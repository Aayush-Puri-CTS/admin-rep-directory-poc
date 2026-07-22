# ADR-004 — Keycloak Identity Linking: `keycloakUserId` on Rep + Interim Gateway Resolution Endpoint

## Status

**Accepted** — adopts `docs/reference/party-identity-linking-keycloak.md`'s Option A decision into
this repo's schema/API surface, with one documented deviation (see **Decision**, point 3) from
that reference's literal `gateway → DB` diagram.

| Sign-off required | Team | Status |
|---|---|---|
| Lead / Architect | Platform | ☐ Pending |
| DBA / Prisma reviewer | Platform | ☐ Pending |
| Gateway / Lambda Authorizer owners | Platform | ☐ Pending — new consumer of `GET /internal/party-identity` |

This ADR covers only the pieces that live inside this repo's own DB/API surface. JWT verification,
the Redis cache, and `x-role`/`x-party-id` header injection remain the external gateway/Lambda
Authorizer's responsibility — see **Out of scope**.

---

## Date

2026-07-21

## Author

Admin Application team

## Reference

`docs/reference/party-identity-linking-keycloak.md` — decides Option A (DB-side `keycloakUserId`
lookup, resolved by the gateway, cached in the Redis it already maintains for JWKS) over Option B
(Keycloak-side `party_id` custom attribute/protocol mapper).

---

## Context

Keycloak's JWT carries only authentication identity (`sub`, `tenant`, a coarse `role` claim) — it
has no concept of which `Rep` (this repo's implementation of the reference ADR's abstract "Party")
a logged-in user corresponds to. A prior gap-analysis pass confirmed none of the reference ADR's
pieces exist in this codebase today: no `keycloakUserId` field, no lookup, no JWT verification, no
Redis cache. This backend currently just trusts a caller-supplied `X-Tenant-Id` header
(`TenantMiddleware`) with no way to distinguish a value injected by a real authorizer from one
typed in by hand — consistent with what `docs/api-spec-for-dashboard.md` already documents.

---

## Decision

1. **`Rep.keycloakUserId`** — nullable `String?`, with `@@unique([tenantId, keycloakUserId])`
   rather than a bare `@unique`. A Keycloak `sub` is only unique within one realm == one tenant
   (ADR-002's tenant model) — unlike `email`, which is a genuine cross-tenant-unique business rule
   today. Postgres composite unique indexes treat `NULL` as distinct from every other `NULL`, so
   Reps with no Keycloak login yet (`keycloakUserId = NULL`) coexist freely, matching the reference
   ADR's consequence that "a Party may legitimately exist with no login yet."

2. **Linking is a follow-up admin action**, never part of Rep creation —
   `PATCH /reps/:repId/keycloak-account` (`LinkRepKeycloakAccountHandler`). This repo has no
   Keycloak Admin API client to auto-provision with, so this models the reference ADR's "async
   handler reacting to the creation event, or a follow-up admin action" as the latter.

3. **Deviation from the reference ADR's literal `GW->>DB` diagram**: the reference document shows
   the gateway querying Postgres directly (`SELECT party_id FROM Party WHERE keycloakUserId = sub`).
   This repo has no Keycloak Admin API client, and the gateway has no direct DB credentials to this
   service's database today — granting them is a platform-team decision outside this repo's
   control. As an interim step, the gateway instead calls
   `GET /internal/party-identity?keycloakUserId=...` (with `X-Tenant-Id`, which the gateway already
   derives from the JWT issuer per ADR-002) rather than querying Postgres directly. The gateway is
   expected to keep its own Redis cache in front of this call, per the reference ADR — this repo
   does not implement caching.

4. **This endpoint has no access control today** beyond requiring `X-Tenant-Id` (enforced by the
   existing global `TenantMiddleware`, which every route already goes through). It **must not** be
   exposed beyond local dev / a locked-down internal network until the platform/gateway team
   decides on a mechanism — shared secret, mTLS, or a network-level restriction (e.g. an ALB rule
   scoping `/internal/*` to the gateway's egress IP/VPC). Tracked as a blocking follow-up before
   production rollout, not designed here.

---

## Consequences

### Positive

- `Rep.keycloakUserId` is additive and nullable — no backfill, no RLS change (`reps` already has
  `FORCE ROW LEVEL SECURITY` from the ADR-002 migration).
- The new read endpoint reuses the exact `withTenantTransaction`/`TenantContext` mechanism every
  other tenant-scoped query already uses — no new tenant-resolution pathway, no change to CLAUDE.md
  hard rule #2 (tenant identity still arrives only via `X-Tenant-Id`, never a query param).
- Composite tenant-scoped uniqueness means a duplicate `sub` across two different tenants' Keycloak
  realms is not a conflict, matching how tenants are actually isolated (ADR-002).

### Negative / risks

- **New cross-team coordination point**: the gateway/Lambda Authorizer team now has a dependency on
  this repo's `/internal/party-identity` endpoint that didn't exist before. Until that team signs
  off (see Status table), this is a one-sided implementation — flagged, not silently assumed away.
- **No access control on the new endpoint** (see Decision, point 4) — this is a known, tracked gap,
  not an oversight. Do not deploy this endpoint to any shared/production environment until it's
  closed.
- **No auto-provisioning**: linking `keycloakUserId` is a manual/admin step today. If Rep volume
  grows to where that's impractical, this ADR would need revisiting alongside a Keycloak Admin API
  client — out of scope here.
- Cache invalidation on relink (e.g. if a Rep's `keycloakUserId` is ever changed) is the gateway's
  responsibility per the reference ADR, not something this service tracks or notifies on.

---

## Alternatives considered

| Option | Status |
|---|---|
| Option B (`party_id` as a Keycloak custom attribute/protocol mapper) | Rejected per the reference ADR — couples Keycloak (an IdP) to business-identity data that should live only in `Party`/`PartyRelationship`. |
| Gateway gets direct Postgres credentials (the reference ADR's literal `GW->>DB`) | Deferred — a platform-team decision; no current mechanism exists for provisioning the gateway with DB credentials to this service's database. |
| Build a Keycloak Admin API client in this repo for auto-provisioning on `RepCreated` | Out of scope — no such client exists today; the `RepCreated` → outbox → NATS pipeline already exists and would be the natural trigger point if this is built later. |

---

## Out of scope

JWT verification, Redis caching, and `x-role`/`x-party-id` header injection — all remain the
external Lambda Authorizer/gateway's responsibility, per the reference ADR and ADR-002. Also out of
scope: an auto-provisioning consumer for `RepCreated`, and the access-control mechanism for
`/internal/party-identity` (flagged above as a blocking follow-up, not designed here).
