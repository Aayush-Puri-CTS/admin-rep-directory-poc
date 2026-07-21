import { IRepReadRepository, PartyIdentityView } from './rep-read.port';

export interface ResolvePartyIdentityByKeycloakUserIdQuery {
  keycloakUserId: string;
}

export class ResolvePartyIdentityByKeycloakUserIdHandler {
  constructor(private readonly repReadRepository: IRepReadRepository) {}

  async execute(
    query: ResolvePartyIdentityByKeycloakUserIdQuery,
  ): Promise<PartyIdentityView | null> {
    return this.repReadRepository.findByKeycloakUserId(query.keycloakUserId);
  }
}
