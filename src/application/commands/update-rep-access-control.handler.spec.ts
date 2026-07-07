import { Rep } from '../../domain/entities/rep.entity';
import { IRepRepository } from '../../domain/ports/rep-repository.port';
import { PlatformAccessType, RepPlatform } from '../../domain/value-objects/access-control.vo';
import { RepId } from '../../domain/value-objects/rep-id.vo';
import { RepPersonalInfo } from '../../domain/value-objects/rep-personal-info.vo';
import { UpdateRepAccessControlHandler } from './update-rep-access-control.handler';

function makeRep(): Rep {
  return Rep.create({
    id: RepId.of('rep-1'),
    personalInfo: RepPersonalInfo.create({ firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' }),
  });
}

function makeRepo(rep: Rep | null): IRepRepository {
  return {
    findById: jest.fn<Promise<Rep | null>, [RepId]>().mockResolvedValue(rep),
    save: jest.fn<Promise<void>, [Rep]>().mockResolvedValue(undefined),
  };
}

describe('UpdateRepAccessControlHandler', () => {
  it('replaces access control and saves', async () => {
    const rep = makeRep();
    const repo = makeRepo(rep);
    await new UpdateRepAccessControlHandler(repo).execute({
      repId: 'rep-1',
      entries: [{ platform: RepPlatform.ENROLLPRIME, accessType: PlatformAccessType.ENABLED }],
    });
    expect(rep.accessControl.hasAccess(RepPlatform.ENROLLPRIME)).toBe(true);
    expect(repo.save).toHaveBeenCalledWith(rep);
  });

  it('can set all platforms to DISABLED', async () => {
    const rep = makeRep();
    const repo = makeRepo(rep);
    await new UpdateRepAccessControlHandler(repo).execute({ repId: 'rep-1', entries: [] });
    expect(rep.accessControl.hasAccess(RepPlatform.ENROLLPRIME)).toBe(false);
  });

  it('throws when rep is not found', async () => {
    const repo = makeRepo(null);
    await expect(
      new UpdateRepAccessControlHandler(repo).execute({ repId: 'rep-1', entries: [] }),
    ).rejects.toThrow('Rep not found: rep-1');
  });
});
