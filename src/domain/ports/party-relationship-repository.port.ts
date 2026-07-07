import { PartyRelationship } from '../entities/party-relationship.entity';
import { RepId } from '../value-objects/rep-id.vo';

export const PARTY_RELATIONSHIP_REPOSITORY = Symbol('IPartyRelationshipRepository');

export interface IPartyRelationshipRepository {
  save(relationship: PartyRelationship): Promise<void>;
  findGroupsByRepId(repId: RepId): Promise<PartyRelationship[]>;
}
