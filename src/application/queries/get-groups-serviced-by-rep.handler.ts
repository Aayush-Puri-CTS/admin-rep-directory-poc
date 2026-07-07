import { IPartyRelationshipRepository } from '../../domain/ports/party-relationship-repository.port';
import { PartyRelationshipType } from '../../domain/value-objects/party-relationship-type';
import { RepId } from '../../domain/value-objects/rep-id.vo';

export interface GetGroupsServicedByRepQuery {
  repId: string;
}

export interface ServicedGroupView {
  groupId: string;
  relationshipType: PartyRelationshipType;
  startDate: Date;
  endDate: Date | null;
}

export class GetGroupsServicedByRepHandler {
  constructor(private readonly partyRelationshipRepository: IPartyRelationshipRepository) {}

  async execute(query: GetGroupsServicedByRepQuery): Promise<ServicedGroupView[]> {
    const relationships = await this.partyRelationshipRepository.findGroupsByRepId(
      RepId.of(query.repId),
    );
    return relationships.map((r) => ({
      groupId: r.groupId,
      relationshipType: r.relationshipType,
      startDate: r.startDate,
      endDate: r.endDate,
    }));
  }
}
