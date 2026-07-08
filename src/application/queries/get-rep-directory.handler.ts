import { IRepReadRepository, PaginationParams, RepDirectoryPage } from './rep-read.port';

export interface GetRepDirectoryQuery {
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export class GetRepDirectoryHandler {
  constructor(private readonly repReadRepository: IRepReadRepository) {}

  async execute(query: GetRepDirectoryQuery): Promise<RepDirectoryPage> {
    const pagination: PaginationParams = {
      page: query.page ?? DEFAULT_PAGE,
      pageSize: Math.min(query.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
    };
    return this.repReadRepository.findDirectory(pagination);
  }
}
