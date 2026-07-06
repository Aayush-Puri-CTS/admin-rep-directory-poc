export interface RepPersonalInfoProps {
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  cellPhone?: string;
  telephone?: string;
  fax?: string;
  num800?: string;
  dateOfBirth?: Date;
  /** Raw value — encryption-at-rest and masking strategy are open questions (see OQ-2 in docs/rep-domain-model.md). */
  ssn?: string;
}

export class RepPersonalInfo {
  readonly firstName: string;
  readonly lastName: string;
  readonly middleName: string | undefined;
  readonly email: string;
  readonly cellPhone: string | undefined;
  readonly telephone: string | undefined;
  readonly fax: string | undefined;
  readonly num800: string | undefined;
  readonly dateOfBirth: Date | undefined;
  readonly ssn: string | undefined;

  private constructor(props: RepPersonalInfoProps) {
    if (!props.firstName.trim()) throw new Error('firstName is required');
    if (!props.lastName.trim()) throw new Error('lastName is required');
    if (!props.email.trim()) throw new Error('email is required');
    this.firstName = props.firstName.trim();
    this.lastName = props.lastName.trim();
    this.middleName = props.middleName?.trim() || undefined;
    this.email = props.email.trim();
    this.cellPhone = props.cellPhone;
    this.telephone = props.telephone;
    this.fax = props.fax;
    this.num800 = props.num800;
    this.dateOfBirth = props.dateOfBirth;
    this.ssn = props.ssn;
  }

  static create(props: RepPersonalInfoProps): RepPersonalInfo {
    return new RepPersonalInfo(props);
  }

  get fullName(): string {
    return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
  }
}
