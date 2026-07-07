import { PartyRelationship } from '../../domain/entities/party-relationship.entity';
import { IPartyRelationshipRepository } from '../../domain/ports/party-relationship-repository.port';
import { PartyRelationshipType } from '../../domain/value-objects/party-relationship-type';
import { RepId } from '../../domain/value-objects/rep-id.vo';
import { GetGroupsServicedByRepHandler } from './get-groups-serviced-by-rep.handler';

function makeRelationship(groupId: string, endDate: Date | null = null): PartyRelationship {
  return PartyRelationship.reconstitute({
    id: 'rel-1',
    repId: RepId.of('rep-1'),
    groupId,
    relationshipType: PartyRelationshipType.SERVICES_GROUP,
    startDate: new Date('2025-01-01'),
    endDate,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  });
}

function makeRepo(relationships: PartyRelationship[]): IPartyRelationshipRepository {
  return {
    findGroupsByRepId: jest.fn<Promise<PartyRelationship[]>, [RepId]>().mockResolvedValue(relationships),
    save: jest.fn<Promise<void>, [PartyRelationship]>().mockResolvedValue(undefined),
  };
}

describe('GetGroupsServicedByRepHandler', () => {
  it('returns a mapped view for each relationship', async () => {
    const repo = makeRepo([makeRelationship('group-1'), makeRelationship('group-2')]);
    const result = await new GetGroupsServicedByRepHandler(repo).execute({ repId: 'rep-1' });
    expect(result).toHaveLength(2);
    expect(result[0].groupId).toBe('group-1');
    expect(result[1].groupId).toBe('group-2');
  });

  it('maps relationshipType, startDate, and endDate', async () => {
    const endDate = new Date('2025-06-01');
    const repo = makeRepo([makeRelationship('group-1', endDate)]);
    const [view] = await new GetGroupsServicedByRepHandler(repo).execute({ repId: 'rep-1' });
    expect(view.relationshipType).toBe(PartyRelationshipType.SERVICES_GROUP);
    expect(view.startDate).toEqual(new Date('2025-01-01'));
    expect(view.endDate).toEqual(endDate);
  });

  it('returns an empty array when the rep has no group relationships', async () => {
    const repo = makeRepo([]);
    const result = await new GetGroupsServicedByRepHandler(repo).execute({ repId: 'rep-1' });
    expect(result).toEqual([]);
  });

  it('queries by the correct repId', async () => {
    const repo = makeRepo([]);
    await new GetGroupsServicedByRepHandler(repo).execute({ repId: 'rep-42' });
    expect(repo.findGroupsByRepId).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'rep-42' }),
    );
  });
});
