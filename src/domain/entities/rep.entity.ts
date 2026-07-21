import { AccessControl } from '../value-objects/access-control.vo';
import { RepBusinessInfo } from '../value-objects/rep-business-info.vo';
import { RepId } from '../value-objects/rep-id.vo';
import { RepPersonalInfo } from '../value-objects/rep-personal-info.vo';
import { RepStatus } from '../value-objects/rep-status';
import { RepType } from '../value-objects/rep-type';

export interface RepDomainEvent {
  type: string;
  repId: string;
  occurredAt: Date;
  payload?: Record<string, unknown>;
}

export interface RepProps {
  id: RepId;
  personalInfo: RepPersonalInfo;
  /** Null for Reps operating as individuals without a registered business. */
  businessInfo: RepBusinessInfo | null;
  status: RepStatus;
  accessControl: AccessControl;
  /** Parent Rep in the downline hierarchy; null for root Reps. */
  uplineRepId: RepId | null;
  repType: RepType | null;
  bio: string | null;
  isEliteBlue: boolean;
  /** Keycloak `sub` claim; null until linked via a follow-up admin action (ADR-004). */
  keycloakUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateRepProps = Pick<RepProps, 'id' | 'personalInfo'> &
  Partial<Pick<RepProps, 'businessInfo' | 'uplineRepId' | 'repType'>>;

export class Rep {
  private _status: RepStatus;
  private _personalInfo: RepPersonalInfo;
  private _businessInfo: RepBusinessInfo | null;
  private _accessControl: AccessControl;
  private _uplineRepId: RepId | null;
  private _repType: RepType | null;
  private _bio: string | null;
  private _isEliteBlue: boolean;
  private _keycloakUserId: string | null;
  private _updatedAt: Date;
  private readonly _domainEvents: RepDomainEvent[] = [];

  readonly id: RepId;
  readonly createdAt: Date;

  private constructor(props: RepProps) {
    this.id = props.id;
    this._status = props.status;
    this._personalInfo = props.personalInfo;
    this._businessInfo = props.businessInfo;
    this._accessControl = props.accessControl;
    this._uplineRepId = props.uplineRepId;
    this._repType = props.repType;
    this._bio = props.bio;
    this._isEliteBlue = props.isEliteBlue;
    this._keycloakUserId = props.keycloakUserId;
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /** Creates a new Rep in PENDING_APPROVAL state. */
  static create(props: CreateRepProps): Rep {
    const now = new Date();
    const rep = new Rep({
      id: props.id,
      personalInfo: props.personalInfo,
      businessInfo: props.businessInfo ?? null,
      status: RepStatus.PENDING_APPROVAL,
      accessControl: AccessControl.defaultForNewRep(),
      uplineRepId: props.uplineRepId ?? null,
      repType: props.repType ?? null,
      bio: null,
      isEliteBlue: false,
      keycloakUserId: null,
      createdAt: now,
      updatedAt: now,
    });
    rep.pushEvent({
      type: 'RepCreated',
      repId: props.id.value,
      occurredAt: now,
      payload: {
        firstName: props.personalInfo.firstName,
        lastName: props.personalInfo.lastName,
        email: props.personalInfo.email,
        repType: props.repType ?? null,
      },
    });
    return rep;
  }

  /** Reconstitutes a Rep from persisted state (no events raised). */
  static reconstitute(props: RepProps): Rep {
    return new Rep(props);
  }

  get status(): RepStatus {
    return this._status;
  }
  get personalInfo(): RepPersonalInfo {
    return this._personalInfo;
  }
  get businessInfo(): RepBusinessInfo | null {
    return this._businessInfo;
  }
  get accessControl(): AccessControl {
    return this._accessControl;
  }
  get uplineRepId(): RepId | null {
    return this._uplineRepId;
  }
  get repType(): RepType | null {
    return this._repType;
  }
  get bio(): string | null {
    return this._bio;
  }
  get isEliteBlue(): boolean {
    return this._isEliteBlue;
  }
  get keycloakUserId(): string | null {
    return this._keycloakUserId;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get domainEvents(): ReadonlyArray<RepDomainEvent> {
    return this._domainEvents;
  }

  /** PENDING_APPROVAL or SUSPENDED → ACTIVE. */
  approve(): void {
    if (this._status === RepStatus.SOFT_DELETED) {
      throw new Error(
        'A soft-deleted Rep must be restored via restore() before it can be approved',
      );
    }
    if (
      this._status !== RepStatus.PENDING_APPROVAL &&
      this._status !== RepStatus.SUSPENDED
    ) {
      throw new Error(`Cannot approve a Rep in status ${this._status}`);
    }
    const from = this._status;
    this._status = RepStatus.ACTIVE;
    this.touch();
    this.pushEvent({
      type: 'RepApproved',
      repId: this.id.value,
      occurredAt: this._updatedAt,
      payload: { from },
    });
  }

  /** ACTIVE → SUSPENDED. */
  suspend(): void {
    if (this._status !== RepStatus.ACTIVE) {
      throw new Error(`Cannot suspend a Rep in status ${this._status}`);
    }
    this._status = RepStatus.SUSPENDED;
    this.touch();
    this.pushEvent({ type: 'RepSuspended', repId: this.id.value, occurredAt: this._updatedAt });
  }

  /** ACTIVE | SUSPENDED → SOFT_DELETED. */
  softDelete(): void {
    if (this._status === RepStatus.SOFT_DELETED) {
      throw new Error('Rep is already soft-deleted');
    }
    if (this._status === RepStatus.PENDING_APPROVAL) {
      throw new Error('Cannot soft-delete a Rep that is pending approval');
    }
    this._status = RepStatus.SOFT_DELETED;
    this.touch();
    this.pushEvent({ type: 'RepSoftDeleted', repId: this.id.value, occurredAt: this._updatedAt });
  }

  /** SOFT_DELETED → ACTIVE. The only valid path out of SOFT_DELETED. */
  restore(): void {
    if (this._status !== RepStatus.SOFT_DELETED) {
      throw new Error(
        `Cannot restore a Rep that is not soft-deleted (current: ${this._status})`,
      );
    }
    this._status = RepStatus.ACTIVE;
    this.touch();
    this.pushEvent({ type: 'RepRestored', repId: this.id.value, occurredAt: this._updatedAt });
  }

  updatePersonalInfo(info: RepPersonalInfo): void {
    this._personalInfo = info;
    this.touch();
    this.pushEvent({
      type: 'RepPersonalInfoUpdated',
      repId: this.id.value,
      occurredAt: this._updatedAt,
      payload: {
        firstName: info.firstName,
        lastName: info.lastName,
        email: info.email,
      },
    });
  }

  updateBusinessInfo(info: RepBusinessInfo | null): void {
    this._businessInfo = info;
    this.touch();
    this.pushEvent({
      type: 'RepBusinessInfoUpdated',
      repId: this.id.value,
      occurredAt: this._updatedAt,
      payload: {
        businessName: info?.businessName ?? null,
      },
    });
  }

  updateAccessControl(control: AccessControl): void {
    this._accessControl = control;
    this.touch();
  }

  updateBio(bio: string | null): void {
    this._bio = bio;
    this.touch();
  }

  setEliteBlue(enabled: boolean): void {
    this._isEliteBlue = enabled;
    this.touch();
  }

  /** Follow-up admin action (ADR-004) — links this Rep to its Keycloak `sub`. Idempotent. */
  linkKeycloakAccount(keycloakUserId: string): void {
    if (this._keycloakUserId === keycloakUserId) return;
    this._keycloakUserId = keycloakUserId;
    this.touch();
    this.pushEvent({
      type: 'RepKeycloakAccountLinked',
      repId: this.id.value,
      occurredAt: this._updatedAt,
      payload: { keycloakUserId },
    });
  }

  /** Call after the outbox has dispatched the accumulated events. */
  clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  private pushEvent(event: RepDomainEvent): void {
    this._domainEvents.push(event);
  }
}
