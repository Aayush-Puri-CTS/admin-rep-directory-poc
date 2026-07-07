import { Rep } from '../../domain/entities/rep.entity';
import { IRepRepository } from '../../domain/ports/rep-repository.port';
import { RepId } from '../../domain/value-objects/rep-id.vo';
import { RepPersonalInfo } from '../../domain/value-objects/rep-personal-info.vo';
import { RepStatus } from '../../domain/value-objects/rep-status';
import { RestoreRepHandler } from './restore-rep.handler';

function makeSoftDeletedRep(): Rep {
  const rep = Rep.create({
    id: RepId.of('rep-1'),
    personalInfo: RepPersonalInfo.create({ firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' }),
  });
  rep.approve();
  rep.softDelete();
  rep.clearDomainEvents();
  return rep;
}

function makeActiveRep(): Rep {
  const rep = Rep.create({
    id: RepId.of('rep-1'),
    personalInfo: RepPersonalInfo.create({ firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' }),
  });
  rep.approve();
  rep.clearDomainEvents();
  return rep;
}

function makeRepo(rep: Rep | null): IRepRepository {
  return {
    findById: jest.fn<Promise<Rep | null>, [RepId]>().mockResolvedValue(rep),
    save: jest.fn<Promise<void>, [Rep]>().mockResolvedValue(undefined),
  };
}

describe('RestoreRepHandler', () => {
  it('restores a SOFT_DELETED rep to ACTIVE and saves', async () => {
    const rep = makeSoftDeletedRep();
    const repo = makeRepo(rep);
    await new RestoreRepHandler(repo).execute({ repId: 'rep-1' });
    expect(rep.status).toBe(RepStatus.ACTIVE);
    expect(repo.save).toHaveBeenCalledWith(rep);
  });

  it('accumulates a RepRestored event on the rep', async () => {
    const rep = makeSoftDeletedRep();
    await new RestoreRepHandler(makeRepo(rep)).execute({ repId: 'rep-1' });
    expect(rep.domainEvents[0].type).toBe('RepRestored');
  });

  it('throws when rep is not found', async () => {
    await expect(
      new RestoreRepHandler(makeRepo(null)).execute({ repId: 'rep-1' }),
    ).rejects.toThrow('Rep not found: rep-1');
  });

  it('propagates domain error when rep is ACTIVE', async () => {
    const rep = makeActiveRep();
    await expect(
      new RestoreRepHandler(makeRepo(rep)).execute({ repId: 'rep-1' }),
    ).rejects.toThrow('Cannot restore a Rep that is not soft-deleted');
  });
});
