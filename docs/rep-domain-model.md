# Rep Domain Model — Implementation Notes

**PR tier:** B — new domain entity and value objects; no Prisma schema, no infrastructure code, no NATS event contract changes.

---

## RepStatus — proposed enum

| Value              | Meaning                                                      |
| ------------------ | ------------------------------------------------------------ |
| `PENDING_APPROVAL` | Newly created Rep, awaiting admin review before operating    |
| `ACTIVE`           | Approved; Rep can operate normally                           |
| `SUSPENDED`        | Temporarily blocked by admin (e.g. compliance hold)         |
| `SOFT_DELETED`     | Deactivated; data is retained and the Rep is recoverable     |

### State machine

```
PENDING_APPROVAL ──approve()──► ACTIVE ──suspend()──► SUSPENDED
                                  ▲                        │
                                  │      restore()         │ softDelete()
                              restore() ◄──────────────────│
                                  │                        │
                              SOFT_DELETED ◄───softDelete()┘
```

**Rules enforced in code:**
- `approve()` accepts `PENDING_APPROVAL` or `SUSPENDED` → transitions to `ACTIVE`
- `approve()` on `SOFT_DELETED` **throws** — must call `restore()` instead
- `suspend()` only accepts `ACTIVE`
- `softDelete()` accepts `ACTIVE` or `SUSPENDED`; throws on `PENDING_APPROVAL` and `SOFT_DELETED`
- `restore()` only accepts `SOFT_DELETED` → transitions to `ACTIVE`

---

## AccessControl — proposed model

Derived from the matrix actions: **Get Access Control** (`agent_id`) and **Update Access Control** (`agent_id`, `platform_type[].platform`, `platform_type[].access_type`).

**RepPlatform enum (derived from matrix):**

| Value          | Source action                              |
| -------------- | ------------------------------------------ |
| `ENROLLPRIME`  | Check Enrollprime Downline Rep Access      |
| `EXTRA_HEALTH` | Check Extra Health Rep Access              |

**PlatformAccessType enum (proposed for POC):**

| Value      | Meaning                       |
| ---------- | ----------------------------- |
| `ENABLED`  | Rep has access to the platform|
| `DISABLED` | Rep does not have access       |

---

## Open questions (do not implement until answered)

### OQ-1 — RepType values
The matrix uses `rep_type` as a filter on **Get All Active Downline Reps** but does not enumerate valid values. The entity stores it as a nullable `string`. Replace with an enum once the legacy type list is confirmed.

### OQ-2 — SSN storage and masking
`ssn` / `agent_ssn` appears in personal-info actions and as a search parameter. Currently stored as a nullable plain string in `RepPersonalInfo`. The encryption-at-rest strategy, masking rules for display, and whether SSN search runs against a hash are all unconfirmed. Mark field as sensitive and revisit before any persistence code is written.

### OQ-3 — Additional RepPlatform values
Only `ENROLLPRIME` and `EXTRA_HEALTH` could be confirmed from the matrix. Verify whether other platforms (e.g. Assure Health) map to a platform key or are handled differently.

### OQ-4 — PlatformAccessType semantics
`access_type` values are not enumerated in the matrix. `ENABLED`/`DISABLED` is a reasonable POC stand-in. Confirm whether access is a binary flag or a richer role/permission set before building any command handler.

### OQ-5 — Address book as a separate aggregate
The matrix contains its own **Rep Address Book** page with Add/Get/Delete/Set-Primary Address actions. Addresses are keyed by `type` (likely MAILING, BUSINESS, etc.) and have a primary flag. This looks like a separate aggregate root (or at minimum a rich collection on the Rep) rather than a field on `RepBusinessInfo`. Not implemented here — needs a separate design conversation.

### OQ-6 — Actions with unresolved request fields
The following matrix rows are marked *"no request fields resolved — route-param/body-passthrough, verify"*. Their shapes are not modelled:
- Get Downline Details, Get Downlines, Get Group Lists, Get Pending Downline Details
- Agent Contract Info, Assure Health Reps, Get Agent Info, Get Rep Info
- Contract Actions, Contract Levels
- Delete Agent Agent User, Get Rep Admin Details
- Delete Doc, Get Docs, Delete Rep License, Get Rep License
- Get Directory

### OQ-7 — is_root derivation vs stored flag
`is_root` appears as a filter parameter in **Get All Active Downline Reps**. Treating it as derivable from `uplineRepId === null`. Confirm this is correct — if root status can exist independently of the upline relationship, it needs a stored flag.

---

## Scope boundary for this PR

**In scope:** `src/domain/entities/rep.entity.ts` and `src/domain/value-objects/` only.

**Explicitly out of scope (follow-up PRs):**
- Prisma schema / migrations (Tier C)
- Repository port implementation
- Command / query handlers
- NATS event schema (Tier D — requires ADR)
- Address book aggregate (OQ-5)
