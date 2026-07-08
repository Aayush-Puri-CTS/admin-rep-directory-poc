import { RepStatus } from '../../domain/value-objects/rep-status';
import { RepType } from '../../domain/value-objects/rep-type';
import { IRepReadRepository, RepSummaryView } from './rep-read.port';

export interface SearchRepsQuery {
  name?: string;
  email?: string;
  status?: RepStatus;
  repType?: RepType;
  businessName?: string;
}

export class SearchRepsHandler {
  constructor(private readonly repReadRepository: IRepReadRepository) {}

  async execute(query: SearchRepsQuery): Promise<RepSummaryView[]> {
    return this.repReadRepository.search(query);
  }
}
