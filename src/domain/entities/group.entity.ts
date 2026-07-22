import { GroupContact } from '../value-objects/group-contact.vo';
import { GroupId } from '../value-objects/group-id.vo';
import { GroupProfile } from '../value-objects/group-profile.vo';
import { GroupStatus } from '../value-objects/group-status';

export interface GroupDomainEvent {
  type: string;
  groupId: string;
  occurredAt: Date;
  payload?: Record<string, unknown>;
}

export interface GroupProps {
  id: GroupId;
  profile: GroupProfile;
  contact: GroupContact;
  status: GroupStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateGroupProps = Pick<GroupProps, 'id' | 'profile' | 'contact'>;

export class Group {
  private _status: GroupStatus;
  private _profile: GroupProfile;
  private _contact: GroupContact;
  private _updatedAt: Date;
  private readonly _domainEvents: GroupDomainEvent[] = [];

  readonly id: GroupId;
  readonly createdAt: Date;

  private constructor(props: GroupProps) {
    this.id = props.id;
    this._status = props.status;
    this._profile = props.profile;
    this._contact = props.contact;
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /** Creates a new Group in PENDING state. */
  static create(props: CreateGroupProps): Group {
    const now = new Date();
    const group = new Group({
      id: props.id,
      profile: props.profile,
      contact: props.contact,
      status: GroupStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    });
    group.pushEvent({
      type: 'GroupCreated',
      groupId: props.id.value,
      occurredAt: now,
      payload: {
        groupName: props.profile.groupName,
        email: props.contact.email,
      },
    });
    return group;
  }

  /** Reconstitutes a Group from persisted state (no events raised). */
  static reconstitute(props: GroupProps): Group {
    return new Group(props);
  }

  get status(): GroupStatus {
    return this._status;
  }
  get profile(): GroupProfile {
    return this._profile;
  }
  get contact(): GroupContact {
    return this._contact;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get domainEvents(): ReadonlyArray<GroupDomainEvent> {
    return this._domainEvents;
  }

  /** PENDING or SUSPENDED → ACTIVE. */
  approve(): void {
    if (this._status === GroupStatus.SOFT_DELETED) {
      throw new Error(
        'A soft-deleted Group must be restored via restore() before it can be approved',
      );
    }
    if (this._status !== GroupStatus.PENDING && this._status !== GroupStatus.SUSPENDED) {
      throw new Error(`Cannot approve a Group in status ${this._status}`);
    }
    const from = this._status;
    this._status = GroupStatus.ACTIVE;
    this.touch();
    this.pushEvent({
      type: 'GroupApproved',
      groupId: this.id.value,
      occurredAt: this._updatedAt,
      payload: { from },
    });
  }

  /** ACTIVE → SUSPENDED. */
  suspend(): void {
    if (this._status !== GroupStatus.ACTIVE) {
      throw new Error(`Cannot suspend a Group in status ${this._status}`);
    }
    this._status = GroupStatus.SUSPENDED;
    this.touch();
    this.pushEvent({
      type: 'GroupSuspended',
      groupId: this.id.value,
      occurredAt: this._updatedAt,
    });
  }

  /** ACTIVE | SUSPENDED → SOFT_DELETED. */
  softDelete(): void {
    if (this._status === GroupStatus.SOFT_DELETED) {
      throw new Error('Group is already soft-deleted');
    }
    if (this._status === GroupStatus.PENDING) {
      throw new Error('Cannot soft-delete a Group that is pending approval');
    }
    this._status = GroupStatus.SOFT_DELETED;
    this.touch();
    this.pushEvent({
      type: 'GroupSoftDeleted',
      groupId: this.id.value,
      occurredAt: this._updatedAt,
    });
  }

  /** SOFT_DELETED → ACTIVE. The only valid path out of SOFT_DELETED. */
  restore(): void {
    if (this._status !== GroupStatus.SOFT_DELETED) {
      throw new Error(
        `Cannot restore a Group that is not soft-deleted (current: ${this._status})`,
      );
    }
    this._status = GroupStatus.ACTIVE;
    this.touch();
    this.pushEvent({
      type: 'GroupRestored',
      groupId: this.id.value,
      occurredAt: this._updatedAt,
    });
  }

  updateProfile(profile: GroupProfile): void {
    this._profile = profile;
    this.touch();
    this.pushEvent({
      type: 'GroupProfileUpdated',
      groupId: this.id.value,
      occurredAt: this._updatedAt,
      payload: {
        groupName: profile.groupName,
        groupCode: profile.groupCode ?? null,
      },
    });
  }

  updateContact(contact: GroupContact): void {
    this._contact = contact;
    this.touch();
    this.pushEvent({
      type: 'GroupContactUpdated',
      groupId: this.id.value,
      occurredAt: this._updatedAt,
      payload: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
      },
    });
  }

  /** Call after the outbox has dispatched the accumulated events. */
  clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  private pushEvent(event: GroupDomainEvent): void {
    this._domainEvents.push(event);
  }
}
