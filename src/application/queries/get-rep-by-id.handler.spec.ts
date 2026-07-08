import { GetRepByIdHandler } from './get-rep-by-id.handler';
import { IRepReadRepository, RepDetailView } from './rep-read.port';
import { RepStatus } from '../../domain/value-objects/rep-status';

function makeRepo(result: RepDetailView | null = null) {
  return {
    findById: jest.fn().mockResolvedValue(result),
    search: jest.fn(),
    findDirectory: jest.fn(),
  } as unknown as IRepReadRepository;
}

function makeDetailView(overrides: Partial<RepDetailView> = {}): RepDetailView {
  return {
    repId: 'rep-1',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    repType: null,
    status: RepStatus.ACTIVE,
    businessName: null,
    isEliteBlue: false,
    createdAt: new Date('2025-01-01'),
    middleName: null,
    cellPhone: null,
    telephone: null,
    fax: null,
    num800: null,
    dateOfBirth: null,
    businessTaxId: null,
    businessEmail: null,
    bio: null,
    uplineRepId: null,
    platformAccess: [],
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

describe('GetRepByIdHandler', () => {
  it('returns null when the rep does not exist', async () => {
    const result = await new GetRepByIdHandler(makeRepo(null)).execute({ repId: 'rep-1' });
    expect(result).toBeNull();
  });

  it('calls findById with the correct repId', async () => {
    const repo = makeRepo(null);
    await new GetRepByIdHandler(repo).execute({ repId: 'rep-42' });
    expect(repo.findById).toHaveBeenCalledWith('rep-42');
  });

  it('returns the detail view when the rep exists', async () => {
    const view = makeDetailView({ repId: 'rep-1', firstName: 'Alice' });
    const result = await new GetRepByIdHandler(makeRepo(view)).execute({ repId: 'rep-1' });
    expect(result).toEqual(view);
  });

  it('surfaces platform access entries', async () => {
    const view = makeDetailView({
      platformAccess: [{ platform: 'ENROLLPRIME' as any, accessType: 'ENABLED' as any }],
    });
    const result = await new GetRepByIdHandler(makeRepo(view)).execute({ repId: 'rep-1' });
    expect(result?.platformAccess).toHaveLength(1);
  });
});
