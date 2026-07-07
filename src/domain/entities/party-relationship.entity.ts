import { RepId } from '../value-objects/rep-id.vo';
import { PartyRelationshipType } from '../value-objects/party-relationship-type';

export interface PartyRelationshipProps {
  id: string;
  repId: RepId;
  /** Group (Employer) ID — plain string until Group gets its own entity and ID value object. */
  groupId: string;
  relationshipType: PartyRelationshipType;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreatePartyRelationshipProps = {
  id: string;
  repId: RepId;
  groupId: string;
  relationshipType: PartyRelationshipType;
  startDate?: Date;
};

export class PartyRelationship {
  readonly id: string;
  readonly repId: RepId;
  readonly groupId: string;
  readonly relationshipType: PartyRelationshipType;
  readonly startDate: Date;
  readonly endDate: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: PartyRelationshipProps) {
    this.id = props.id;
    this.repId = props.repId;
    this.groupId = props.groupId;
    this.relationshipType = props.relationshipType;
    this.startDate = props.startDate;
    this.endDate = props.endDate;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: CreatePartyRelationshipProps): PartyRelationship {
    const now = new Date();
    return new PartyRelationship({
      id: props.id,
      repId: props.repId,
      groupId: props.groupId,
      relationshipType: props.relationshipType,
      startDate: props.startDate ?? now,
      endDate: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: PartyRelationshipProps): PartyRelationship {
    return new PartyRelationship(props);
  }
}
