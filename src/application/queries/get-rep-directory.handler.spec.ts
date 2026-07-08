import { GetRepDirectoryHandler } from './get-rep-directory.handler';
import { IRepReadRepository, RepDirectoryPage, RepSummaryView } from './rep-read.port';
import { RepStatus } from '../../domain/value-objects/rep-status';

function makeRepo(page: Partial<RepDirectoryPage> = {}) {
  const defaultPage: RepDirectoryPage = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    ...page,
  };
  return {
    findById: jest.fn(),
    search: jest.fn(),
    findDirectory: jest.fn().mockResolvedValue(defaultPage),
  } as unknown as IRepReadRepository;
}

function makeSummaryView(overrides: Partial<RepSummaryView> = {}): RepSummaryView {
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
    ...overrides,
  };
}

describe('GetRepDirectoryHandler', () => {
  it('uses page 1 and pageSize 20 by default', async () => {
    const repo = makeRepo();
    await new GetRepDirectoryHandler(repo).execute({});
    expect(repo.findDirectory).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
  });

  it('forwards explicit page and pageSize to the repository', async () => {
    const repo = makeRepo();
    await new GetRepDirectoryHandler(repo).execute({ page: 3, pageSize: 50 });
    expect(repo.findDirectory).toHaveBeenCalledWith({ page: 3, pageSize: 50 });
  });

  it('caps pageSize at 100', async () => {
    const repo = makeRepo();
    await new GetRepDirectoryHandler(repo).execute({ pageSize: 999 });
    expect(repo.findDirectory).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: 100 }),
    );
  });

  it('returns the paginated page from the repository', async () => {
    const items = [makeSummaryView()];
    const repo = makeRepo({ items, total: 1, page: 1, pageSize: 20 });
    const result = await new GetRepDirectoryHandler(repo).execute({});
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('accepts a custom query without mutating unspecified defaults', async () => {
    const repo = makeRepo();
    await new GetRepDirectoryHandler(repo).execute({ page: 2 });
    expect(repo.findDirectory).toHaveBeenCalledWith({ page: 2, pageSize: 20 });
  });
});
