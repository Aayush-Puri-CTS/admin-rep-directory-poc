import { SearchRepsHandler, SearchRepsQuery } from './search-reps.handler';
import { IRepReadRepository, RepSummaryView } from './rep-read.port';
import { RepStatus } from '../../domain/value-objects/rep-status';
import { RepType } from '../../domain/value-objects/rep-type';

function makeRepo(results: RepSummaryView[] = []) {
  return {
    findById: jest.fn(),
    search: jest.fn().mockResolvedValue(results),
    findDirectory: jest.fn(),
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

describe('SearchRepsHandler', () => {
  it('passes all provided filters to the repository', async () => {
    const repo = makeRepo();
    const query: SearchRepsQuery = {
      name: 'Alice',
      email: 'alice@',
      status: RepStatus.ACTIVE,
      repType: RepType.GA,
      businessName: 'Acme',
    };
    await new SearchRepsHandler(repo).execute(query);
    expect(repo.search).toHaveBeenCalledWith(query);
  });

  it('passes empty filters when no filters are provided', async () => {
    const repo = makeRepo();
    await new SearchRepsHandler(repo).execute({});
    expect(repo.search).toHaveBeenCalledWith({});
  });

  it('returns the list of matching reps', async () => {
    const views = [makeSummaryView({ repId: 'rep-1' }), makeSummaryView({ repId: 'rep-2' })];
    const result = await new SearchRepsHandler(makeRepo(views)).execute({});
    expect(result).toHaveLength(2);
    expect(result[0].repId).toBe('rep-1');
  });

  it('returns an empty array when no reps match', async () => {
    const result = await new SearchRepsHandler(makeRepo([])).execute({ name: 'Nobody' });
    expect(result).toEqual([]);
  });

  it('supports filtering by status only', async () => {
    const repo = makeRepo();
    await new SearchRepsHandler(repo).execute({ status: RepStatus.SUSPENDED });
    expect(repo.search).toHaveBeenCalledWith({ status: RepStatus.SUSPENDED });
  });
});
