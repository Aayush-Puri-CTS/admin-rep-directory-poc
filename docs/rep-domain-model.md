# Rep Domain Model — Implementation Notes

**PR tier:** B — new domain entity and value objects; no Prisma schema, no infrastructure code, no NATS event contract changes.

---

## RepStatus

| Value              | Meaning                                                   |
| ------------------ | --------------------------------------------------------- |
| `PENDING_APPROVAL` | Newly created Rep, awaiting admin review before operating |
| `ACTIVE`           | Approved; Rep can operate normally                        |
| `SUSPENDED`        | Temporarily blocked by admin (e.g. compliance hold)       |
| `SOFT_DELETED`     | Deactivated; data is retained and the Rep is recoverable  |

### State machine

```
PENDING_APPROVAL ──approve()──► ACTIVE ──suspend()──► SUSPENDED
                                  ▲                        │
                                  │                        │ softDelete()
                              restore()                    ▼
                                  │             SOFT_DELETED ◄──softDelete()──(ACTIVE)
                                  └─────────────────────────
```

**Rules enforced in code:**
- `approve()` accepts `PENDING_APPROVAL` or `SUSPENDED` → transitions to `ACTIVE`
- `approve()` on `SOFT_DELETED` **throws** — must call `restore()` instead
- `suspend()` only accepts `ACTIVE`
- `softDelete()` accepts `ACTIVE` or `SUSPENDED`; throws on `PENDING_APPROVAL` and `SOFT_DELETED`
- `restore()` only accepts `SOFT_DELETED` → transitions to `ACTIVE`

---

## RepType

Resolved for POC. Values derived from the matrix field `super_ga` in `UpdateAgentPersonalRequest`
(confirming that level exists) and standard health-insurance distribution hierarchy terminology.

| Value       | Meaning                                                         |
| ----------- | --------------------------------------------------------------- |
| `AGENT`     | Standard individual field agent                                 |
| `BROKER`    | Independent licensed broker                                     |
| `GA`        | General Agent — manages a downline of agents                    |
| `MGA`       | Managing General Agent — manages GAs                            |
| `SUPER_GA`  | Senior/Super GA; the `super_ga` field in matrix confirms exists |

**Rationale:** The five levels cover the distribution hierarchy that appears in the matrix filter
(`rep_type`) and in the explicit `super_ga` field on the personal-info update action. Using an enum
rather than a free string prevents typos and makes the hierarchy queryable.

---

## AccessControl

Derived from **Get Access Control** and **Update Access Control** matrix actions
(`platform_type[].platform`, `platform_type[].access_type`).

### RepPlatform

| Value          | Source                                                        |
| -------------- | ------------------------------------------------------------- |
| `ENROLLPRIME`  | "Check Enrollprime Downline Rep Access" action                |
| `EXTRA_HEALTH` | "Check Extra Health Rep Access" action                        |
| `ASSURE_HEALTH`| "Assure Health Reps" action under Rep / Agent Details         |

**Rationale (OQ-3):** "Assure Health Reps" is a named action in the matrix; the naming pattern
matches the other two platform-check actions, so ASSURE_HEALTH is a reasonable third platform value.
If additional platforms exist they can be added to the enum — no data migration needed unless rows
exist.

### PlatformAccessType

| Value      | Meaning                         |
| ---------- | ------------------------------- |
| `ENABLED`  | Rep has access to the platform  |
| `DISABLED` | Rep does not have access        |

**Rationale (OQ-4):** The matrix actions are named "Check [platform] Downline Rep Access" — binary
checks (has/doesn't have). A richer role/permission model would surface differently in the action
names (e.g. "Get [platform] Permission Level"). ENABLED/DISABLED is confirmed.

---

## RepAddressType

Resolved for POC. Derived from standard insurance back-office address categories; the matrix uses
a `type` field on Add/Get/Delete Address actions without enumerating values.

| Value      | Meaning                                        |
| ---------- | ---------------------------------------------- |
| `MAILING`  | Official correspondence address                |
| `BUSINESS` | Primary business location / registered address |
| `HOME`     | Residential address                            |
| `BILLING`  | Payment and invoicing address                  |

**Rationale (OQ-5):** These four types appear universally in insurance distribution systems. The
matrix's `payee_name` field on addresses confirms at least a BILLING/MAILING distinction exists.
Using an enum rather than a free string prevents duplicates (`mailing` vs `MAILING` vs `Mailing`).

---

## SSN handling (OQ-2)

**POC decision:** Store as a nullable plain `String` in the database. Never return the raw value
in list or search responses; mask to last-4 in all detail responses.

**Rationale:** Full column-level encryption requires key-management infrastructure (KMS, Vault)
that is out of scope for a POC. The masking rule is a minimal guardrail until production
encryption is wired. The field is annotated in the schema comment as sensitive to prevent
accidental exposure.

**Production requirement (not in scope here):** Replace with encrypted column or move SSN to a
dedicated secrets store before any tenant data is ingested.

---

## is_root (OQ-7) — derivable, no stored flag

`is_root` in the matrix is a filter parameter on **Get All Active Downline Reps**, not a stored
attribute. It is derivable from `uplineRepId === null`.

**Rationale:** Storing a redundant `isRoot` flag alongside `uplineRepId` creates a consistency
hazard — a Rep could have `uplineRepId` set but `isRoot = true`. The upline FK is the single
source of truth; the query layer derives root status from it.

---

## Deferred — actions with unresolved request fields (OQ-6)

The following matrix rows are marked *"no request fields resolved — route-param/body-passthrough,
verify"*. Their shapes are not modelled in the domain layer and will be handled when the query
handler layer is built:

- Get Downline Details, Get Downlines, Get Group Lists, Get Pending Downline Details
- Agent Contract Info, Assure Health Reps action detail, Get Agent Info, Get Rep Info
- Contract Actions, Contract Levels
- Delete Agent Agent User, Get Rep Admin Details
- Delete Doc, Get Docs, Delete Rep License, Get Rep License
- Get Directory

These are all read/detail endpoints whose input is almost certainly a route-param `repId`; the
exact response shape will be confirmed when the query handlers are scoped.

---

## Scope boundary

**In scope (this PR):** `src/domain/entities/` and `src/domain/value-objects/` only.

**Explicitly out of scope (follow-up PRs):**
- Prisma schema / migrations (Tier C)
- Repository port implementation
- Command / query handlers
- NATS event schema (Tier D — requires ADR)
