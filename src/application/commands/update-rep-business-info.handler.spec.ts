import { Rep } from '../../domain/entities/rep.entity';
import { IRepRepository } from '../../domain/ports/rep-repository.port';
import { RepId } from '../../domain/value-objects/rep-id.vo';
import { RepPersonalInfo } from '../../domain/value-objects/rep-personal-info.vo';
import { UpdateRepBusinessInfoHandler } from './update-rep-business-info.handler';

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

describe('UpdateRepBusinessInfoHandler', () => {
  it('sets businessInfo when provided', async () => {
    const rep = makeRep();
    const repo = makeRepo(rep);
    await new UpdateRepBusinessInfoHandler(repo).execute({
      repId: 'rep-1',
      businessInfo: { businessName: 'Acme Corp', businessTaxId: '12-3456789' },
    });
    expect(rep.businessInfo?.businessName).toBe('Acme Corp');
    expect(rep.businessInfo?.businessTaxId).toBe('12-3456789');
    expect(repo.save).toHaveBeenCalledWith(rep);
  });

  it('clears businessInfo when null is passed', async () => {
    const rep = makeRep();
    const repo = makeRepo(rep);
    await new UpdateRepBusinessInfoHandler(repo).execute({ repId: 'rep-1', businessInfo: null });
    expect(rep.businessInfo).toBeNull();
  });

  it('throws when rep is not found', async () => {
    const repo = makeRepo(null);
    await expect(
      new UpdateRepBusinessInfoHandler(repo).execute({ repId: 'rep-1', businessInfo: null }),
    ).rejects.toThrow('Rep not found: rep-1');
  });
});
