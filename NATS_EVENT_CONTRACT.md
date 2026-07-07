# NATS Event Contract — Admin Application

> **Status:** Proposed — do not build consumers against these subjects until ADR-001 is **Accepted**.
> See [`ADR/ADR-001-nats-event-contract.md`](ADR/ADR-001-nats-event-contract.md) for the full
> decision record, sign-off table, and versioning rules.
>
> Questions or change requests → Admin Application team (aayushpuri@cloudtechservice.com)

---

## Quick reference

| Event | Subject | Trigger |
|-------|---------|---------|
| `RepCreated` | `admin.rep.created` | New Rep registered |
| `RepPersonalInfoUpdated` | `admin.rep.personal-info-updated` | Name / email / phone changed |
| `RepBusinessInfoUpdated` | `admin.rep.business-info-updated` | Business name / tax ID changed or cleared |
| `RepApproved` | `admin.rep.approved` | Rep moved to ACTIVE |
| `RepSuspended` | `admin.rep.suspended` | Rep suspended |
| `RepSoftDeleted` | `admin.rep.soft-deleted` | Rep soft-deleted |
| `RepRestored` | `admin.rep.restored` | Soft-deleted Rep restored to ACTIVE |
| `RepGroupLinked` | `admin.rep.group-linked` | Rep linked to a Group (Employer) |

Wildcard subscription for all Rep events: `admin.rep.*`

---

## Message envelope

Every message published to any `admin.rep.*` subject is a JSON object with this structure:

```typescript
interface AdminRepEvent {
  eventType:   string;   // identifies the event — matches the table above
  aggregateId: string;   // Rep UUID
  occurredAt:  string;   // ISO-8601 UTC — when the domain event occurred (not when published)
  payload:     object;   // event-specific fields — see schemas below
}
```

**Delivery guarantee:** at-least-once (outbox retry). **Consumers must be idempotent.**
The relay retries failed publishes up to 5 times; events are guaranteed to be in the outbox
before the HTTP response returns to the caller.

---

## Event schemas

### `RepCreated` → `admin.rep.created`

Fired when a new Rep record is created. The Rep starts in `PENDING_APPROVAL` status and is not yet
active on any platform.

```typescript
interface RepCreatedPayload {
  firstName: string;
  lastName:  string;
  email:     string;
  repType:   'AGENT' | 'BROKER' | 'GA' | 'MGA' | 'SUPER_GA' | null;
}
```

**Example:**
```json
{
  "eventType":   "RepCreated",
  "aggregateId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "occurredAt":  "2025-06-01T09:00:00.000Z",
  "payload": {
    "firstName": "Alice",
    "lastName":  "Smith",
    "email":     "alice@example.com",
    "repType":   "GA"
  }
}
```

---

### `RepPersonalInfoUpdated` → `admin.rep.personal-info-updated`

Fired when a Rep's name or contact email changes. Does not fire for phone/fax/address changes
(those are not yet surfaced as events).

```typescript
interface RepPersonalInfoUpdatedPayload {
  firstName: string;
  lastName:  string;
  email:     string;
}
```

---

### `RepBusinessInfoUpdated` → `admin.rep.business-info-updated`

Fired when a Rep's business info is set or cleared. `businessName: null` means the Rep no longer
has associated business info (switched to individual).

```typescript
interface RepBusinessInfoUpdatedPayload {
  businessName: string | null;
}
```

---

### `RepApproved` → `admin.rep.approved`

Fired when a Rep transitions to `ACTIVE` status. This happens both on first approval (from
`PENDING_APPROVAL`) and on reactivation after suspension.

```typescript
interface RepApprovedPayload {
  from: 'PENDING_APPROVAL' | 'SUSPENDED';
}
```

---

### `RepSuspended` → `admin.rep.suspended`

Fired when an active Rep is suspended. The Rep loses platform access until restored or reactivated.

```typescript
interface RepSuspendedPayload {
  // empty — aggregateId and occurredAt in the envelope carry sufficient context
}
```

---

### `RepSoftDeleted` → `admin.rep.soft-deleted`

Fired when a Rep record is soft-deleted. The record is retained in the database but the Rep is
no longer operational. Use `RepRestored` to undo.

```typescript
interface RepSoftDeletedPayload {
  // empty
}
```

---

### `RepRestored` → `admin.rep.restored`

Fired when a previously soft-deleted Rep is restored to `ACTIVE` status.

```typescript
interface RepRestoredPayload {
  // empty
}
```

---

### `RepGroupLinked` → `admin.rep.group-linked`

Fired when a Rep is linked to a Group (Employer) via a `SERVICES_GROUP` relationship.
The inverse (unlinking) is not yet implemented — `endDate` on the relationship will be
the signal when it is.

> ⚠️ `SERVICES_GROUP` is a proposed relationship type value pending team confirmation.
> See ADR-001 open items.

```typescript
interface RepGroupLinkedPayload {
  groupId:          string;   // Group (Employer) UUID
  relationshipType: string;   // currently always 'SERVICES_GROUP'
  startDate:        string;   // ISO-8601 UTC — effective start of the relationship
}
```

**Example:**
```json
{
  "eventType":   "RepGroupLinked",
  "aggregateId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "occurredAt":  "2025-06-15T14:30:00.000Z",
  "payload": {
    "groupId":          "b2c3d4e5-f6a7-8901-bcde-f23456789012",
    "relationshipType": "SERVICES_GROUP",
    "startDate":        "2025-06-15T00:00:00.000Z"
  }
}
```

---

## Consuming guidelines

1. **Always check `eventType`** before reading `payload` — use it as a discriminator even when
   subscribing to a specific subject. Future additive changes may introduce subtypes.
2. **Ignore unknown fields** in `payload` — additive changes (new optional fields) will not be
   preceded by a breaking-change notice.
3. **Store `occurredAt`, not the wall-clock time you received the message** — events may be
   delivered with a delay relative to when they occurred (outbox polling lag, network).
4. **Treat `aggregateId` as the stable Rep identifier** across all events.
5. **Handle duplicates** — the outbox guarantees at-least-once delivery; your consumer must
   be idempotent on `(eventType, aggregateId, occurredAt)`.

---

## Backward-compatibility policy

| Change type | Notice required | ADR update |
|-------------|----------------|------------|
| New optional field in existing payload | Notify consuming teams | Update this file |
| New event type / new subject | Notify consuming teams | Update this file |
| Renamed field / removed field | Breaking — migration plan required | New ADR |
| Renamed subject | Breaking — migration plan required | New ADR |
| Changed field type | Breaking — migration plan required | New ADR |

---

## Change log

| Version | Date | Change |
|---------|------|--------|
| 0.1.0 | 2026-07-07 | Initial draft — all events listed above |
