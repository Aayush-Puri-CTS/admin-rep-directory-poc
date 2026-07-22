import { GroupContact } from '../value-objects/group-contact.vo';
import { GroupId } from '../value-objects/group-id.vo';
import { GroupProfile } from '../value-objects/group-profile.vo';
import { GroupStatus } from '../value-objects/group-status';
import { Group, GroupProps } from './group.entity';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeProfile(overrides?: Partial<Parameters<typeof GroupProfile.create>[0]>) {
  return GroupProfile.create({
    groupName: 'Acme Employer',
    ...overrides,
  });
}

function makeContact(overrides?: Partial<Parameters<typeof GroupContact.create>[0]>) {
  return GroupContact.create({
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    ...overrides,
  });
}

function newGroup(): Group {
  return Group.create({ id: GroupId.of('group-1'), profile: makeProfile(), contact: makeContact() });
}

function activeGroup(): Group {
  const group = newGroup();
  group.approve();
  group.clearDomainEvents();
  return group;
}

function suspendedGroup(): Group {
  const group = activeGroup();
  group.suspend();
  group.clearDomainEvents();
  return group;
}

function softDeletedGroup(): Group {
  const group = activeGroup();
  group.softDelete();
  group.clearDomainEvents();
  return group;
}

// ---------------------------------------------------------------------------
// create()
// ---------------------------------------------------------------------------

describe('Group.create()', () => {
  it('produces PENDING status', () => {
    expect(newGroup().status).toBe(GroupStatus.PENDING);
  });

  it('raises a GroupCreated event', () => {
    const group = newGroup();
    expect(group.domainEvents).toHaveLength(1);
    expect(group.domainEvents[0].type).toBe('GroupCreated');
    expect(group.domainEvents[0].groupId).toBe('group-1');
  });

  it('sets profile and contact from props', () => {
    const group = newGroup();
    expect(group.profile.groupName).toBe('Acme Employer');
    expect(group.contact.email).toBe('alice@example.com');
  });
});

// ---------------------------------------------------------------------------
// reconstitute()
// ---------------------------------------------------------------------------

describe('Group.reconstitute()', () => {
  it('preserves all props without raising events', () => {
    const now = new Date('2024-01-01');
    const props: GroupProps = {
      id: GroupId.of('group-99'),
      profile: makeProfile({ groupName: 'Reconstituted Corp' }),
      contact: makeContact({ email: 'bob@example.com' }),
      status: GroupStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    };
    const group = Group.reconstitute(props);
    expect(group.status).toBe(GroupStatus.ACTIVE);
    expect(group.profile.groupName).toBe('Reconstituted Corp');
    expect(group.contact.email).toBe('bob@example.com');
    expect(group.domainEvents).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// approve()
// ---------------------------------------------------------------------------

describe('approve()', () => {
  it('PENDING → ACTIVE', () => {
    const group = newGroup();
    group.approve();
    expect(group.status).toBe(GroupStatus.ACTIVE);
  });

  it('raises GroupApproved event with from=PENDING', () => {
    const group = newGroup();
    group.approve();
    const evt = group.domainEvents.find((e) => e.type === 'GroupApproved');
    expect(evt?.payload?.from).toBe(GroupStatus.PENDING);
  });

  it('SUSPENDED → ACTIVE (reactivation)', () => {
    const group = suspendedGroup();
    group.approve();
    expect(group.status).toBe(GroupStatus.ACTIVE);
  });

  it('raises GroupApproved event with from=SUSPENDED when reactivating', () => {
    const group = suspendedGroup();
    group.approve();
    const evt = group.domainEvents.find((e) => e.type === 'GroupApproved');
    expect(evt?.payload?.from).toBe(GroupStatus.SUSPENDED);
  });

  it('throws when Group is ACTIVE', () => {
    expect(() => activeGroup().approve()).toThrow();
  });

  it('throws when Group is SOFT_DELETED — must use restore()', () => {
    const group = softDeletedGroup();
    expect(() => group.approve()).toThrow(
      'A soft-deleted Group must be restored via restore() before it can be approved',
    );
    expect(group.status).toBe(GroupStatus.SOFT_DELETED);
  });
});

// ---------------------------------------------------------------------------
// suspend()
// ---------------------------------------------------------------------------

describe('suspend()', () => {
  it('ACTIVE → SUSPENDED', () => {
    const group = activeGroup();
    group.suspend();
    expect(group.status).toBe(GroupStatus.SUSPENDED);
  });

  it('raises GroupSuspended event', () => {
    const group = activeGroup();
    group.suspend();
    expect(group.domainEvents[0].type).toBe('GroupSuspended');
  });

  it('throws when Group is PENDING', () => {
    expect(() => newGroup().suspend()).toThrow(
      `Cannot suspend a Group in status ${GroupStatus.PENDING}`,
    );
  });

  it('throws when Group is already SUSPENDED', () => {
    expect(() => suspendedGroup().suspend()).toThrow();
  });

  it('throws when Group is SOFT_DELETED', () => {
    expect(() => softDeletedGroup().suspend()).toThrow();
  });
});

// ---------------------------------------------------------------------------
// softDelete()
// ---------------------------------------------------------------------------

describe('softDelete()', () => {
  it('ACTIVE → SOFT_DELETED', () => {
    const group = activeGroup();
    group.softDelete();
    expect(group.status).toBe(GroupStatus.SOFT_DELETED);
  });

  it('SUSPENDED → SOFT_DELETED', () => {
    const group = suspendedGroup();
    group.softDelete();
    expect(group.status).toBe(GroupStatus.SOFT_DELETED);
  });

  it('raises GroupSoftDeleted event', () => {
    const group = activeGroup();
    group.softDelete();
    expect(group.domainEvents[0].type).toBe('GroupSoftDeleted');
  });

  it('throws when Group is PENDING', () => {
    expect(() => newGroup().softDelete()).toThrow(
      'Cannot soft-delete a Group that is pending approval',
    );
  });

  it('throws when Group is already SOFT_DELETED', () => {
    expect(() => softDeletedGroup().softDelete()).toThrow('Group is already soft-deleted');
  });
});

// ---------------------------------------------------------------------------
// restore()
// ---------------------------------------------------------------------------

describe('restore()', () => {
  it('SOFT_DELETED → ACTIVE', () => {
    const group = softDeletedGroup();
    group.restore();
    expect(group.status).toBe(GroupStatus.ACTIVE);
  });

  it('raises GroupRestored event', () => {
    const group = softDeletedGroup();
    group.restore();
    expect(group.domainEvents[0].type).toBe('GroupRestored');
  });

  it('throws when Group is ACTIVE — restore is only for soft-deleted Groups', () => {
    expect(() => activeGroup().restore()).toThrow(
      `Cannot restore a Group that is not soft-deleted (current: ${GroupStatus.ACTIVE})`,
    );
  });

  it('throws when Group is SUSPENDED', () => {
    expect(() => suspendedGroup().restore()).toThrow();
  });

  it('throws when Group is PENDING', () => {
    expect(() => newGroup().restore()).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Mutation methods
// ---------------------------------------------------------------------------

describe('updateProfile()', () => {
  it('replaces profile', () => {
    const group = activeGroup();
    const updated = makeProfile({ groupName: 'New Name Inc' });
    group.updateProfile(updated);
    expect(group.profile.groupName).toBe('New Name Inc');
  });

  it('raises GroupProfileUpdated with groupName in payload', () => {
    const group = activeGroup();
    group.updateProfile(makeProfile({ groupName: 'New Name Inc' }));
    const evt = group.domainEvents.find((e) => e.type === 'GroupProfileUpdated');
    expect(evt?.payload?.groupName).toBe('New Name Inc');
  });
});

describe('updateContact()', () => {
  it('replaces contact', () => {
    const group = activeGroup();
    group.updateContact(makeContact({ firstName: 'Bob', email: 'bob@example.com' }));
    expect(group.contact.firstName).toBe('Bob');
    expect(group.contact.email).toBe('bob@example.com');
  });

  it('raises GroupContactUpdated with firstName, lastName, email in payload', () => {
    const group = activeGroup();
    group.updateContact(makeContact({ firstName: 'Bob', email: 'bob@example.com' }));
    const evt = group.domainEvents.find((e) => e.type === 'GroupContactUpdated');
    expect(evt?.payload?.firstName).toBe('Bob');
    expect(evt?.payload?.email).toBe('bob@example.com');
  });
});

// ---------------------------------------------------------------------------
// clearDomainEvents()
// ---------------------------------------------------------------------------

describe('clearDomainEvents()', () => {
  it('empties the event list', () => {
    const group = newGroup();
    expect(group.domainEvents).toHaveLength(1);
    group.clearDomainEvents();
    expect(group.domainEvents).toHaveLength(0);
  });
});
