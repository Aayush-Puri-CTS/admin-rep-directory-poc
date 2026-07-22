export interface GroupProfileProps {
  groupName: string;
  groupCode?: string;
  taxId?: string;
  industry?: string;
  type?: string;
}

export class GroupProfile {
  readonly groupName: string;
  readonly groupCode: string | undefined;
  readonly taxId: string | undefined;
  readonly industry: string | undefined;
  readonly type: string | undefined;

  private constructor(props: GroupProfileProps) {
    if (!props.groupName.trim()) throw new Error('groupName is required');
    this.groupName = props.groupName.trim();
    this.groupCode = props.groupCode?.trim() || undefined;
    this.taxId = props.taxId?.trim() || undefined;
    this.industry = props.industry?.trim() || undefined;
    this.type = props.type?.trim() || undefined;
  }

  static create(props: GroupProfileProps): GroupProfile {
    return new GroupProfile(props);
  }
}
