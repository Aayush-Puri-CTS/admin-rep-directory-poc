export class GroupId {
  private constructor(readonly value: string) {}

  static of(value: string): GroupId {
    if (!value || !value.trim()) {
      throw new Error('GroupId must not be empty');
    }
    return new GroupId(value.trim());
  }

  equals(other: GroupId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
