import { PartyRelationship } from './party-relationship.entity';
import { PartyRelationshipType } from '../value-objects/party-relationship-type';
import { RepId } from '../value-objects/rep-id.vo';

const baseProps = {
  id: 'rel-1',
  repId: RepId.of('rep-1'),
  groupId: 'group-1',
  relationshipType: PartyRelationshipType.SERVICES_GROUP,
};

describe('PartyRelationship.create()', () => {
  it('raises a RepGroupLinked event', () => {
    const rel = PartyRelationship.create(baseProps);
    expect(rel.domainEvents).toHaveLength(1);
    expect(rel.domainEvents[0].type).toBe('RepGroupLinked');
  });

  it('RepGroupLinked event carries repId and groupId in payload', () => {
    const rel = PartyRelationship.create(baseProps);
    const evt = rel.domainEvents[0];
    expect(evt.repId).toBe('rep-1');
    expect(evt.payload?.groupId).toBe('group-1');
    expect(evt.payload?.relationshipType).toBe(PartyRelationshipType.SERVICES_GROUP);
  });

  it('uses provided startDate in the event payload', () => {
    const startDate = new Date('2025-03-01');
    const rel = PartyRelationship.create({ ...baseProps, startDate });
    expect(rel.domainEvents[0].payload?.startDate).toBe(startDate.toISOString());
  });

  it('endDate defaults to null', () => {
    expect(PartyRelationship.create(baseProps).endDate).toBeNull();
  });
});

describe('PartyRelationship.reconstitute()', () => {
  it('does not raise events', () => {
    const now = new Date();
    const rel = PartyRelationship.reconstitute({
      ...baseProps,
      startDate: now,
      endDate: null,
      createdAt: now,
      updatedAt: now,
    });
    expect(rel.domainEvents).toHaveLength(0);
  });
});

describe('clearDomainEvents()', () => {
  it('empties the event list', () => {
    const rel = PartyRelationship.create(baseProps);
    expect(rel.domainEvents).toHaveLength(1);
    rel.clearDomainEvents();
    expect(rel.domainEvents).toHaveLength(0);
  });
});
