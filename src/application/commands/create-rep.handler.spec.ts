import { Rep } from '../../domain/entities/rep.entity';
import { IRepRepository } from '../../domain/ports/rep-repository.port';
import { RepId } from '../../domain/value-objects/rep-id.vo';
import { RepStatus } from '../../domain/value-objects/rep-status';
import { RepType } from '../../domain/value-objects/rep-type';
import { CreateRepCommand, CreateRepHandler } from './create-rep.handler';

function makeRepo(): { repo: IRepRepository; savedRep: () => Rep } {
  let saved: Rep;
  const repo: IRepRepository = {
    findById: jest.fn<Promise<Rep | null>, [RepId]>().mockResolvedValue(null),
    save: jest.fn<Promise<void>, [Rep]>().mockImplementation(async (r) => {
      saved = r;
    }),
  };
  return { repo, savedRep: () => saved };
}

const minimalCommand: CreateRepCommand = {
  repId: 'rep-1',
  firstName: 'Alice',
  lastName: 'Smith',
  email: 'alice@example.com',
};

describe('CreateRepHandler', () => {
  it('saves a Rep in PENDING_APPROVAL status', async () => {
    const { repo, savedRep } = makeRepo();
    await new CreateRepHandler(repo).execute(minimalCommand);
    expect(savedRep().status).toBe(RepStatus.PENDING_APPROVAL);
  });

  it('accumulates a RepCreated domain event on the saved rep', async () => {
    const { repo, savedRep } = makeRepo();
    await new CreateRepHandler(repo).execute(minimalCommand);
    const events = savedRep().domainEvents;
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('RepCreated');
    expect(events[0].repId).toBe('rep-1');
  });

  it('sets businessInfo when businessName is provided', async () => {
    const { repo, savedRep } = makeRepo();
    await new CreateRepHandler(repo).execute({
      ...minimalCommand,
      businessName: 'Acme Corp',
      businessTaxId: '12-3456789',
    });
    expect(savedRep().businessInfo?.businessName).toBe('Acme Corp');
    expect(savedRep().businessInfo?.businessTaxId).toBe('12-3456789');
  });

  it('leaves businessInfo null when businessName is omitted', async () => {
    const { repo, savedRep } = makeRepo();
    await new CreateRepHandler(repo).execute(minimalCommand);
    expect(savedRep().businessInfo).toBeNull();
  });

  it('sets uplineRepId when provided', async () => {
    const { repo, savedRep } = makeRepo();
    await new CreateRepHandler(repo).execute({ ...minimalCommand, uplineRepId: 'rep-0' });
    expect(savedRep().uplineRepId?.value).toBe('rep-0');
  });

  it('leaves uplineRepId null when omitted', async () => {
    const { repo, savedRep } = makeRepo();
    await new CreateRepHandler(repo).execute(minimalCommand);
    expect(savedRep().uplineRepId).toBeNull();
  });

  it('sets repType when provided', async () => {
    const { repo, savedRep } = makeRepo();
    await new CreateRepHandler(repo).execute({ ...minimalCommand, repType: RepType.GA });
    expect(savedRep().repType).toBe(RepType.GA);
  });

  it('propagates domain validation errors (empty firstName)', async () => {
    const { repo } = makeRepo();
    await expect(
      new CreateRepHandler(repo).execute({ ...minimalCommand, firstName: '' }),
    ).rejects.toThrow('firstName is required');
  });
});
