import { Rep } from '../../domain/entities/rep.entity';
import { IRepRepository } from '../../domain/ports/rep-repository.port';
import { RepId } from '../../domain/value-objects/rep-id.vo';
import { RepPersonalInfo } from '../../domain/value-objects/rep-personal-info.vo';
import { RepStatus } from '../../domain/value-objects/rep-status';
import { SoftDeleteRepHandler } from './soft-delete-rep.handler';

function makeActiveRep(): Rep {
  const rep = Rep.create({
    id: RepId.of('rep-1'),
    personalInfo: RepPersonalInfo.create({ firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' }),
  });
  rep.approve();
  rep.clearDomainEvents();
  return rep;
}

function makePendingRep(): Rep {
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

describe('SoftDeleteRepHandler', () => {
  it('soft-deletes an ACTIVE rep and saves', async () => {
    const rep = makeActiveRep();
    const repo = makeRepo(rep);
    await new SoftDeleteRepHandler(repo).execute({ repId: 'rep-1' });
    expect(rep.status).toBe(RepStatus.SOFT_DELETED);
    expect(repo.save).toHaveBeenCalledWith(rep);
  });

  it('accumulates a RepSoftDeleted event on the rep', async () => {
    const rep = makeActiveRep();
    await new SoftDeleteRepHandler(makeRepo(rep)).execute({ repId: 'rep-1' });
    expect(rep.domainEvents[0].type).toBe('RepSoftDeleted');
  });

  it('throws when rep is not found', async () => {
    await expect(
      new SoftDeleteRepHandler(makeRepo(null)).execute({ repId: 'rep-1' }),
    ).rejects.toThrow('Rep not found: rep-1');
  });

  it('propagates domain error for PENDING_APPROVAL rep', async () => {
    const rep = makePendingRep();
    await expect(
      new SoftDeleteRepHandler(makeRepo(rep)).execute({ repId: 'rep-1' }),
    ).rejects.toThrow('Cannot soft-delete a Rep that is pending approval');
  });
});
