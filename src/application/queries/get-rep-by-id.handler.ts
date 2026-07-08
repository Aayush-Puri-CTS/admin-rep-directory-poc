import { IRepReadRepository, RepDetailView } from './rep-read.port';

export interface GetRepByIdQuery {
  repId: string;
}

export class GetRepByIdHandler {
  constructor(private readonly repReadRepository: IRepReadRepository) {}

  async execute(query: GetRepByIdQuery): Promise<RepDetailView | null> {
    return this.repReadRepository.findById(query.repId);
  }
}
