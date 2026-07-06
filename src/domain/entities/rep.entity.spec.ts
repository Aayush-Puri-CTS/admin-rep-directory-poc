import { AccessControl, PlatformAccessType, RepPlatform } from '../value-objects/access-control.vo';
import { RepBusinessInfo } from '../value-objects/rep-business-info.vo';
import { RepId } from '../value-objects/rep-id.vo';
import { RepPersonalInfo } from '../value-objects/rep-personal-info.vo';
import { RepStatus } from '../value-objects/rep-status';
import { Rep, RepProps } from './rep.entity';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makePersonalInfo(overrides?: Partial<Parameters<typeof RepPersonalInfo.create>[0]>) {
  return RepPersonalInfo.create({
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    ...overrides,
  });
}

function newRep(): Rep {
  return Rep.create({ id: RepId.of('rep-1'), personalInfo: makePersonalInfo() });
}

function activeRep(): Rep {
  const rep = newRep();
  rep.approve();
  rep.clearDomainEvents();
  return rep;
}

function suspendedRep(): Rep {
  const rep = activeRep();
  rep.suspend();
  rep.clearDomainEvents();
  return rep;
}

function softDeletedRep(): Rep {
  const rep = activeRep();
  rep.softDelete();
  rep.clearDomainEvents();
  return rep;
}

// ---------------------------------------------------------------------------
// create()
// ---------------------------------------------------------------------------

describe('Rep.create()', () => {
  it('produces PENDING_APPROVAL status', () => {
    expect(newRep().status).toBe(RepStatus.PENDING_APPROVAL);
  });

  it('raises a RepCreated event', () => {
    const rep = newRep();
    expect(rep.domainEvents).toHaveLength(1);
    expect(rep.domainEvents[0].type).toBe('RepCreated');
    expect(rep.domainEvents[0].repId).toBe('rep-1');
  });

  it('defaults isEliteBlue to false', () => {
    expect(newRep().isEliteBlue).toBe(false);
  });

  it('defaults bio to null', () => {
    expect(newRep().bio).toBeNull();
  });

  it('defaults accessControl to all DISABLED', () => {
    const ac = newRep().accessControl;
    expect(ac.hasAccess(RepPlatform.ENROLLPRIME)).toBe(false);
    expect(ac.hasAccess(RepPlatform.EXTRA_HEALTH)).toBe(false);
  });

  it('sets uplineRepId when provided', () => {
    const rep = Rep.create({
      id: RepId.of('rep-2'),
      personalInfo: makePersonalInfo(),
      uplineRepId: RepId.of('rep-1'),
    });
    expect(rep.uplineRepId?.value).toBe('rep-1');
  });

  it('uplineRepId defaults to null', () => {
    expect(newRep().uplineRepId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// reconstitute()
// ---------------------------------------------------------------------------

describe('Rep.reconstitute()', () => {
  it('preserves all props without raising events', () => {
    const now = new Date('2024-01-01');
    const props: RepProps = {
      id: RepId.of('rep-99'),
      personalInfo: makePersonalInfo(),
      businessInfo: null,
      status: RepStatus.ACTIVE,
      accessControl: AccessControl.defaultForNewRep(),
      uplineRepId: null,
      repType: 'SENIOR',
      bio: 'Experienced rep.',
      isEliteBlue: true,
      createdAt: now,
      updatedAt: now,
    };
    const rep = Rep.reconstitute(props);
    expect(rep.status).toBe(RepStatus.ACTIVE);
    expect(rep.repType).toBe('SENIOR');
    expect(rep.bio).toBe('Experienced rep.');
    expect(rep.isEliteBlue).toBe(true);
    expect(rep.domainEvents).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// approve()
// ---------------------------------------------------------------------------

describe('approve()', () => {
  it('PENDING_APPROVAL → ACTIVE', () => {
    const rep = newRep();
    rep.approve();
    expect(rep.status).toBe(RepStatus.ACTIVE);
  });

  it('raises RepApproved event with from=PENDING_APPROVAL', () => {
    const rep = newRep();
    rep.approve();
    const evt = rep.domainEvents.find((e) => e.type === 'RepApproved');
    expect(evt?.payload?.from).toBe(RepStatus.PENDING_APPROVAL);
  });

  it('SUSPENDED → ACTIVE (reactivation)', () => {
    const rep = suspendedRep();
    rep.approve();
    expect(rep.status).toBe(RepStatus.ACTIVE);
  });

  it('raises RepApproved event with from=SUSPENDED when reactivating', () => {
    const rep = suspendedRep();
    rep.approve();
    const evt = rep.domainEvents.find((e) => e.type === 'RepApproved');
    expect(evt?.payload?.from).toBe(RepStatus.SUSPENDED);
  });

  it('throws when Rep is ACTIVE', () => {
    expect(() => activeRep().approve()).toThrow();
  });

  it('throws when Rep is SOFT_DELETED — must use restore()', () => {
    const rep = softDeletedRep();
    expect(() => rep.approve()).toThrow(
      'A soft-deleted Rep must be restored via restore() before it can be approved',
    );
    expect(rep.status).toBe(RepStatus.SOFT_DELETED);
  });
});

// ---------------------------------------------------------------------------
// suspend()
// ---------------------------------------------------------------------------

describe('suspend()', () => {
  it('ACTIVE → SUSPENDED', () => {
    const rep = activeRep();
    rep.suspend();
    expect(rep.status).toBe(RepStatus.SUSPENDED);
  });

  it('raises RepSuspended event', () => {
    const rep = activeRep();
    rep.suspend();
    expect(rep.domainEvents[0].type).toBe('RepSuspended');
  });

  it('throws when Rep is PENDING_APPROVAL', () => {
    expect(() => newRep().suspend()).toThrow(
      `Cannot suspend a Rep in status ${RepStatus.PENDING_APPROVAL}`,
    );
  });

  it('throws when Rep is already SUSPENDED', () => {
    expect(() => suspendedRep().suspend()).toThrow();
  });

  it('throws when Rep is SOFT_DELETED', () => {
    expect(() => softDeletedRep().suspend()).toThrow();
  });
});

// ---------------------------------------------------------------------------
// softDelete()
// ---------------------------------------------------------------------------

describe('softDelete()', () => {
  it('ACTIVE → SOFT_DELETED', () => {
    const rep = activeRep();
    rep.softDelete();
    expect(rep.status).toBe(RepStatus.SOFT_DELETED);
  });

  it('SUSPENDED → SOFT_DELETED', () => {
    const rep = suspendedRep();
    rep.softDelete();
    expect(rep.status).toBe(RepStatus.SOFT_DELETED);
  });

  it('raises RepSoftDeleted event', () => {
    const rep = activeRep();
    rep.softDelete();
    expect(rep.domainEvents[0].type).toBe('RepSoftDeleted');
  });

  it('throws when Rep is PENDING_APPROVAL', () => {
    expect(() => newRep().softDelete()).toThrow(
      'Cannot soft-delete a Rep that is pending approval',
    );
  });

  it('throws when Rep is already SOFT_DELETED', () => {
    expect(() => softDeletedRep().softDelete()).toThrow('Rep is already soft-deleted');
  });
});

// ---------------------------------------------------------------------------
// restore()
// ---------------------------------------------------------------------------

describe('restore()', () => {
  it('SOFT_DELETED → ACTIVE', () => {
    const rep = softDeletedRep();
    rep.restore();
    expect(rep.status).toBe(RepStatus.ACTIVE);
  });

  it('raises RepRestored event', () => {
    const rep = softDeletedRep();
    rep.restore();
    expect(rep.domainEvents[0].type).toBe('RepRestored');
  });

  it('throws when Rep is ACTIVE — restore is only for soft-deleted Reps', () => {
    expect(() => activeRep().restore()).toThrow(
      `Cannot restore a Rep that is not soft-deleted (current: ${RepStatus.ACTIVE})`,
    );
  });

  it('throws when Rep is SUSPENDED', () => {
    expect(() => suspendedRep().restore()).toThrow();
  });

  it('throws when Rep is PENDING_APPROVAL', () => {
    expect(() => newRep().restore()).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Mutation methods
// ---------------------------------------------------------------------------

describe('updatePersonalInfo()', () => {
  it('replaces personalInfo', () => {
    const rep = activeRep();
    const updated = makePersonalInfo({ firstName: 'Bob' });
    rep.updatePersonalInfo(updated);
    expect(rep.personalInfo.firstName).toBe('Bob');
  });
});

describe('updateBusinessInfo()', () => {
  it('sets businessInfo', () => {
    const rep = activeRep();
    rep.updateBusinessInfo(RepBusinessInfo.create({ businessName: 'Acme Corp' }));
    expect(rep.businessInfo?.businessName).toBe('Acme Corp');
  });

  it('clears businessInfo when passed null', () => {
    const rep = activeRep();
    rep.updateBusinessInfo(null);
    expect(rep.businessInfo).toBeNull();
  });
});

describe('updateAccessControl()', () => {
  it('replaces accessControl', () => {
    const rep = activeRep();
    const ac = AccessControl.create([
      { platform: RepPlatform.ENROLLPRIME, accessType: PlatformAccessType.ENABLED },
    ]);
    rep.updateAccessControl(ac);
    expect(rep.accessControl.hasAccess(RepPlatform.ENROLLPRIME)).toBe(true);
  });
});

describe('updateBio()', () => {
  it('sets bio', () => {
    const rep = activeRep();
    rep.updateBio('Top performer in Q3.');
    expect(rep.bio).toBe('Top performer in Q3.');
  });

  it('clears bio when passed null', () => {
    const rep = activeRep();
    rep.updateBio('Some bio');
    rep.updateBio(null);
    expect(rep.bio).toBeNull();
  });
});

describe('setEliteBlue()', () => {
  it('enables elite blue', () => {
    const rep = activeRep();
    rep.setEliteBlue(true);
    expect(rep.isEliteBlue).toBe(true);
  });

  it('disables elite blue', () => {
    const rep = activeRep();
    rep.setEliteBlue(true);
    rep.setEliteBlue(false);
    expect(rep.isEliteBlue).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// clearDomainEvents()
// ---------------------------------------------------------------------------

describe('clearDomainEvents()', () => {
  it('empties the event list', () => {
    const rep = newRep();
    expect(rep.domainEvents).toHaveLength(1);
    rep.clearDomainEvents();
    expect(rep.domainEvents).toHaveLength(0);
  });
});
