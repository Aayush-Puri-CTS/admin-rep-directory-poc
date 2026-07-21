import { Rep } from '../../domain/entities/rep.entity';
import { IRepRepository } from '../../domain/ports/rep-repository.port';
import { RepId } from '../../domain/value-objects/rep-id.vo';
import { RepPersonalInfo } from '../../domain/value-objects/rep-personal-info.vo';
import { LinkRepKeycloakAccountHandler } from './link-rep-keycloak-account.handler';

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

describe('LinkRepKeycloakAccountHandler', () => {
  it('links the keycloakUserId and saves', async () => {
    const rep = makeRep();
    const repo = makeRepRepo(rep);
    await new LinkRepKeycloakAccountHandler(repo).execute({ repId: 'rep-1', keycloakUserId: 'sub-123' });
    expect(rep.keycloakUserId).toBe('sub-123');
    expect(repo.save).toHaveBeenCalledWith(rep);
  });

  it('throws when rep is not found', async () => {
    const repo = makeRepRepo(null);
    await expect(
      new LinkRepKeycloakAccountHandler(repo).execute({ repId: 'rep-1', keycloakUserId: 'sub-123' }),
    ).rejects.toThrow('Rep not found: rep-1');
  });

  it('does not save when rep is not found', async () => {
    const repo = makeRepRepo(null);
    await expect(
      new LinkRepKeycloakAccountHandler(repo).execute({ repId: 'rep-1', keycloakUserId: 'sub-123' }),
    ).rejects.toThrow();
    expect(repo.save).not.toHaveBeenCalled();
  });
});
