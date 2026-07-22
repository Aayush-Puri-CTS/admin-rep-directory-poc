import { GroupId } from './group-id.vo';

describe('GroupId', () => {
  it('creates a GroupId from a valid string', () => {
    const id = GroupId.of('group-123');
    expect(id.value).toBe('group-123');
  });

  it('trims whitespace', () => {
    const id = GroupId.of('  group-123  ');
    expect(id.value).toBe('group-123');
  });

  it('throws on empty string', () => {
    expect(() => GroupId.of('')).toThrow('GroupId must not be empty');
  });

  it('throws on whitespace-only string', () => {
    expect(() => GroupId.of('   ')).toThrow('GroupId must not be empty');
  });

  it('equals returns true for same value', () => {
    expect(GroupId.of('abc').equals(GroupId.of('abc'))).toBe(true);
  });

  it('equals returns false for different values', () => {
    expect(GroupId.of('abc').equals(GroupId.of('xyz'))).toBe(false);
  });

  it('toString returns the underlying value', () => {
    expect(GroupId.of('group-42').toString()).toBe('group-42');
  });
});
