import { PartyRelationship } from '../../domain/entities/party-relationship.entity';
import { IPartyRelationshipRepository } from '../../domain/ports/party-relationship-repository.port';
import { IRepRepository } from '../../domain/ports/rep-repository.port';
import { PartyRelationshipType } from '../../domain/value-objects/party-relationship-type';
import { RepId } from '../../domain/value-objects/rep-id.vo';

export interface LinkRepToGroupCommand {
  relationshipId: string;
  repId: string;
  groupId: string;
  startDate?: Date;
}

export class LinkRepToGroupHandler {
  constructor(
    private readonly repRepository: IRepRepository,
    private readonly partyRelationshipRepository: IPartyRelationshipRepository,
  ) {}

  async execute(command: LinkRepToGroupCommand): Promise<void> {
    const rep = await this.repRepository.findById(RepId.of(command.repId));
    if (rep === null) {
      throw new Error(`Rep not found: ${command.repId}`);
    }
    const relationship = PartyRelationship.create({
      id: command.relationshipId,
      repId: rep.id,
      groupId: command.groupId,
      relationshipType: PartyRelationshipType.SERVICES_GROUP,
      startDate: command.startDate,
    });
    await this.partyRelationshipRepository.save(relationship);
  }
}
