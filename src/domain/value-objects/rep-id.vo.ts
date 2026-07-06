export class RepId {
  private constructor(readonly value: string) {}

  static of(value: string): RepId {
    if (!value || !value.trim()) {
      throw new Error('RepId must not be empty');
    }
    return new RepId(value.trim());
  }

  equals(other: RepId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
