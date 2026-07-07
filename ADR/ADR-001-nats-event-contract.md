# ADR-001 — NATS Event Contract for Admin Application Domain Events

## Status

**Proposed** — pending Lead/Architect approval.
Consuming teams must not take a dependency on these subjects until this ADR is **Accepted**.

| Sign-off required | Team | Status |
|-------------------|------|--------|
| Lead / Architect | Platform | ⬜ Pending |
| Plan Selection | Plan Selection service | ⬜ Pending |
| Enrollment | Enrollment service | ⬜ Pending |
| Commissions | Commissions service | ⬜ Pending |

Update the table and change **Status** to **Accepted** once all approvals are collected.

---

## Date

2026-07-07

## Author

Admin Application team

---

## Context

The Admin Application is the **write model** for the Party-Role/Party-Relationship core directory
(Reps, Groups/Employers, Customers). Downstream services — Plan Selection, Enrollment, Invoicing,
Payments, Commissions — need to react to directory changes without polling the Admin API directly.

We implemented a transactional outbox pattern (see `infrastructure/outbox/`) in which domain events
are written to an `outbox_events` table in the same DB transaction as the aggregate save.
An `OutboxRelayService` polls the table and publishes events to NATS core (not JetStream —
see **Consequences** for the trade-offs).

This ADR defines:
- The NATS subject hierarchy
- The message envelope schema (fields present on every message)
- The payload schema for each event type
- Versioning and backward-compatibility rules

---

## Decision

### 1. Subject hierarchy

```
admin.<aggregate>.<event-slug>
```

| Event type | NATS subject |
|------------|-------------|
| `RepCreated` | `admin.rep.created` |
| `RepPersonalInfoUpdated` | `admin.rep.personal-info-updated` |
| `RepBusinessInfoUpdated` | `admin.rep.business-info-updated` |
| `RepApproved` | `admin.rep.approved` |
| `RepSuspended` | `admin.rep.suspended` |
| `RepSoftDeleted` | `admin.rep.soft-deleted` |
| `RepRestored` | `admin.rep.restored` |
| `RepGroupLinked` | `admin.rep.group-linked` |

Unknown or future event types fall back to `admin.events.<EventType>` until a subject is
formally registered in this ADR.

Consumers that want all Rep events can subscribe to the wildcard `admin.rep.*`.

### 2. Message envelope

Every message is JSON-encoded. All fields below are always present.

```jsonc
{
  "eventType": "RepCreated",        // string — discriminator; see table above
  "aggregateId": "uuid",            // string — Rep ID (UUID)
  "occurredAt": "2025-01-01T00:00:00.000Z",  // ISO-8601 UTC timestamp of the domain event
  "payload": { /* event-specific — see §3 */ }
}
```

### 3. Per-event payload schemas

#### `RepCreated`
Raised when a new Rep is created. Rep starts in `PENDING_APPROVAL` status.

```jsonc
{
  "firstName": "Alice",             // string
  "lastName":  "Smith",             // string
  "email":     "alice@example.com", // string
  "repType":   "GA" | null          // string enum (AGENT | BROKER | GA | MGA | SUPER_GA) or null
}
```

#### `RepPersonalInfoUpdated`
Raised when a Rep's personal contact information changes.

```jsonc
{
  "firstName": "Alice",             // string
  "lastName":  "Smith",             // string
  "email":     "alice@example.com"  // string
}
```

#### `RepBusinessInfoUpdated`
Raised when a Rep's business info is set or cleared.

```jsonc
{
  "businessName": "Acme Corp" | null  // string or null (null = business info removed)
}
```

#### `RepApproved`
Raised when a Rep transitions to `ACTIVE` status (from `PENDING_APPROVAL` or `SUSPENDED`).

```jsonc
{
  "from": "PENDING_APPROVAL" | "SUSPENDED"  // previous status
}
```

#### `RepSuspended`
Raised when an `ACTIVE` Rep is suspended. Payload is empty.

```jsonc
{}
```

#### `RepSoftDeleted`
Raised when a Rep is soft-deleted. Payload is empty.

```jsonc
{}
```

#### `RepRestored`
Raised when a soft-deleted Rep is restored to `ACTIVE`. Payload is empty.

```jsonc
{}
```

#### `RepGroupLinked`
Raised when a Rep is linked to a Group (Employer) via a `SERVICES_GROUP` relationship.

```jsonc
{
  "groupId":          "uuid",           // string — Group ID
  "relationshipType": "SERVICES_GROUP", // string enum — ⚠️ value pending team confirmation
  "startDate":        "2025-01-01T00:00:00.000Z"  // ISO-8601 UTC
}
```

> ⚠️ `SERVICES_GROUP` is a proposed relationship type value. Confirm against the legacy
> `PartyRelationshipType` enum before this ADR is accepted.

### 4. Transport

- **NATS core publish** (fire-and-forget, at-most-once delivery at the transport layer).
- Reliability is provided by the **transactional outbox**: the relay retries up to 5 times
  on failure before flagging the row for manual triage.
- Consumers should be **idempotent** — at-least-once delivery is possible if the relay
  publishes but fails to update `publishedAt` before a crash.

### 5. Versioning rules

- **Additive changes** (new optional fields in payload, new event types) are backward-compatible
  and do not require a new ADR — update this document and notify consuming teams.
- **Breaking changes** (renamed fields, removed fields, changed types, renamed subjects) require
  a new ADR and a migration plan before any consuming team is affected.
- Subject names are considered **stable** from the moment this ADR is **Accepted**.

---

## Consequences

### Positive
- Consuming services are decoupled from the Admin API; they react to events asynchronously.
- Transactional outbox guarantees events are not lost even if NATS is temporarily unavailable.
- Explicit subject map makes the contract auditable in code review.

### Negative / Trade-offs
- **At-most-once at transport layer** — NATS core does not persist messages. If a consumer is
  down when an event is published and misses the window, it will not receive it. Mitigation:
  migrate to NATS JetStream (persistent streams + consumer groups) when the service graduates
  from POC to production.
- **Polling latency** — default 5 s poll interval means up to 5 s lag between write and
  publish. Acceptable for this service's SLA; tunable via `OUTBOX_POLL_INTERVAL_MS`.
- **Manual triage for dead-letter rows** — rows at `retryCount >= 5` are skipped. An alerting
  mechanism (e.g., a Prometheus metric on skipped rows) should be added before production.

### Open items
- [ ] Confirm `SERVICES_GROUP` enum value with legacy system / team convention
- [ ] Decide whether to migrate to NATS JetStream before production
- [ ] Add alerting for `retryCount >= MAX_RETRIES` rows
- [ ] Evaluate whether `RepApproved`/`RepSuspended` should be consumed by Commissions
