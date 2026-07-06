import { RepId } from './rep-id.vo';

describe('RepId', () => {
  it('creates a RepId from a valid string', () => {
    const id = RepId.of('agent-123');
    expect(id.value).toBe('agent-123');
  });

  it('trims whitespace', () => {
    const id = RepId.of('  agent-123  ');
    expect(id.value).toBe('agent-123');
  });

  it('throws on empty string', () => {
    expect(() => RepId.of('')).toThrow('RepId must not be empty');
  });

  it('throws on whitespace-only string', () => {
    expect(() => RepId.of('   ')).toThrow('RepId must not be empty');
  });

  it('equals returns true for same value', () => {
    expect(RepId.of('abc').equals(RepId.of('abc'))).toBe(true);
  });

  it('equals returns false for different values', () => {
    expect(RepId.of('abc').equals(RepId.of('xyz'))).toBe(false);
  });

  it('toString returns the underlying value', () => {
    expect(RepId.of('agent-42').toString()).toBe('agent-42');
  });
});
