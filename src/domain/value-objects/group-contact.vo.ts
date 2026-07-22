export interface GroupContactProps {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  fax?: string;
}

export class GroupContact {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string | undefined;
  readonly fax: string | undefined;

  private constructor(props: GroupContactProps) {
    if (!props.firstName.trim()) throw new Error('firstName is required');
    if (!props.lastName.trim()) throw new Error('lastName is required');
    if (!props.email.trim()) throw new Error('email is required');
    this.firstName = props.firstName.trim();
    this.lastName = props.lastName.trim();
    this.email = props.email.trim();
    this.phone = props.phone?.trim() || undefined;
    this.fax = props.fax?.trim() || undefined;
  }

  static create(props: GroupContactProps): GroupContact {
    return new GroupContact(props);
  }
}
