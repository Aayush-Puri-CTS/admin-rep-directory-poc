import { GroupProfile } from './group-profile.vo';

const base = { groupName: 'Acme Corp' };

describe('GroupProfile', () => {
  it('creates with required field only', () => {
    const profile = GroupProfile.create(base);
    expect(profile.groupName).toBe('Acme Corp');
    expect(profile.groupCode).toBeUndefined();
    expect(profile.taxId).toBeUndefined();
    expect(profile.industry).toBeUndefined();
    expect(profile.type).toBeUndefined();
  });

  it('trims groupName', () => {
    const profile = GroupProfile.create({ groupName: '  Acme Corp  ' });
    expect(profile.groupName).toBe('Acme Corp');
  });

  it('throws when groupName is empty', () => {
    expect(() => GroupProfile.create({ groupName: '' })).toThrow('groupName is required');
  });

  it('throws when groupName is whitespace-only', () => {
    expect(() => GroupProfile.create({ groupName: '   ' })).toThrow('groupName is required');
  });

  it('trims optional fields when provided', () => {
    const profile = GroupProfile.create({
      groupName: 'Acme Corp',
      groupCode: ' AC1 ',
      taxId: ' 12-3456789 ',
      industry: ' Manufacturing ',
      type: ' Employer ',
    });
    expect(profile.groupCode).toBe('AC1');
    expect(profile.taxId).toBe('12-3456789');
    expect(profile.industry).toBe('Manufacturing');
    expect(profile.type).toBe('Employer');
  });

  it('normalizes whitespace-only optional fields to undefined', () => {
    const profile = GroupProfile.create({
      groupName: 'Acme Corp',
      groupCode: '   ',
      taxId: '   ',
      industry: '   ',
      type: '   ',
    });
    expect(profile.groupCode).toBeUndefined();
    expect(profile.taxId).toBeUndefined();
    expect(profile.industry).toBeUndefined();
    expect(profile.type).toBeUndefined();
  });

  it('accepts undefined optional fields', () => {
    const profile = GroupProfile.create({
      groupName: 'Acme Corp',
      groupCode: undefined,
      taxId: undefined,
      industry: undefined,
      type: undefined,
    });
    expect(profile.groupCode).toBeUndefined();
    expect(profile.taxId).toBeUndefined();
    expect(profile.industry).toBeUndefined();
    expect(profile.type).toBeUndefined();
  });

  it('marks fields readonly at the type level (reassignment is a compile error)', () => {
    const profile = GroupProfile.create({ groupName: 'Acme Corp', groupCode: 'AC1' });
    expect(profile.groupName).toBe('Acme Corp');
    // The line below only compiles because of the suppressed error; if the
    // `readonly` modifier were ever removed from GroupProfile, this test file
    // would fail to compile with "Unused '@ts-expect-error' directive".
    // @ts-expect-error readonly field assignment must fail to compile
    profile.groupName = 'Other Corp';
  });
});
