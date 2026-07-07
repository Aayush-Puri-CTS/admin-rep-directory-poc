import { PartyRelationship } from '../../domain/entities/party-relationship.entity';
import { IPartyRelationshipRepository } from '../../domain/ports/party-relationship-repository.port';
import { IRepRepository } from '../../domain/ports/rep-repository.port';
import { PartyRelationshipType } from '../../domain/value-objects/party-relationship-type';
import { RepId } from '../../domain/value-objects/rep-id.vo';
import { RepPersonalInfo } from '../../domain/value-objects/rep-personal-info.vo';
import { Rep } from '../../domain/entities/rep.entity';
import { LinkRepToGroupCommand, LinkRepToGroupHandler } from './link-rep-to-group.handler';

function makeRep(): Rep {
  return Rep.create({
    id: RepId.of('rep-1'),
    personalInfo: RepPersonalInfo.create({ firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' }),
  });
}

function makeRepRepo(rep: Rep | null): IRepRepository {
  return {
    findById: jest.fn<Promise<Rep | null>, [RepId]>().mockResolvedValue(rep),
    save: jest.fn<Promise<void>, [Rep]>().mockResolvedValue(undefined),
  };
}

function makeRelationshipRepo(): { repo: IPartyRelationshipRepository; saved: () => PartyRelationship } {
  let saved: PartyRelationship;
  const repo: IPartyRelationshipRepository = {
    findGroupsByRepId: jest.fn<Promise<PartyRelationship[]>, [RepId]>().mockResolvedValue([]),
    save: jest.fn<Promise<void>, [PartyRelationship]>().mockImplementation(async (r) => { saved = r; }),
  };
  return { repo, saved: () => saved };
}

const command: LinkRepToGroupCommand = {
  relationshipId: 'rel-1',
  repId: 'rep-1',
  groupId: 'group-1',
};

describe('LinkRepToGroupHandler', () => {
  it('creates a SERVICES_GROUP relationship and saves it', async () => {
    const { repo, saved } = makeRelationshipRepo();
    await new LinkRepToGroupHandler(makeRepRepo(makeRep()), repo).execute(command);
    expect(saved().relationshipType).toBe(PartyRelationshipType.SERVICES_GROUP);
    expect(saved().groupId).toBe('group-1');
    expect(saved().repId.value).toBe('rep-1');
    expect(saved().endDate).toBeNull();
  });

  it('uses the provided startDate', async () => {
    const startDate = new Date('2025-01-01');
    const { repo, saved } = makeRelationshipRepo();
    await new LinkRepToGroupHandler(makeRepRepo(makeRep()), repo).execute({ ...command, startDate });
    expect(saved().startDate).toEqual(startDate);
  });

  it('throws when rep is not found', async () => {
    const { repo } = makeRelationshipRepo();
    await expect(
      new LinkRepToGroupHandler(makeRepRepo(null), repo).execute(command),
    ).rejects.toThrow('Rep not found: rep-1');
  });

  it('does not save when rep is not found', async () => {
    const { repo } = makeRelationshipRepo();
    await expect(
      new LinkRepToGroupHandler(makeRepRepo(null), repo).execute(command),
    ).rejects.toThrow();
    expect(repo.save).not.toHaveBeenCalled();
  });
});
