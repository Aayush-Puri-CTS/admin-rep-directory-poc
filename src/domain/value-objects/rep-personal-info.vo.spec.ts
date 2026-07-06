import { RepPersonalInfo } from './rep-personal-info.vo';

const base = { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' };

describe('RepPersonalInfo', () => {
  it('creates with required fields only', () => {
    const info = RepPersonalInfo.create(base);
    expect(info.firstName).toBe('Jane');
    expect(info.lastName).toBe('Doe');
    expect(info.email).toBe('jane@example.com');
    expect(info.middleName).toBeUndefined();
  });

  it('trims name and email fields', () => {
    const info = RepPersonalInfo.create({ firstName: ' Jane ', lastName: ' Doe ', email: ' jane@example.com ' });
    expect(info.firstName).toBe('Jane');
    expect(info.lastName).toBe('Doe');
    expect(info.email).toBe('jane@example.com');
  });

  it('middleName trims to undefined when whitespace-only', () => {
    const info = RepPersonalInfo.create({ ...base, middleName: '   ' });
    expect(info.middleName).toBeUndefined();
  });

  it('computes fullName without middle name', () => {
    expect(RepPersonalInfo.create(base).fullName).toBe('Jane Doe');
  });

  it('computes fullName with middle name', () => {
    const info = RepPersonalInfo.create({ ...base, middleName: 'Marie' });
    expect(info.fullName).toBe('Jane Marie Doe');
  });

  it('throws when firstName is empty', () => {
    expect(() => RepPersonalInfo.create({ ...base, firstName: '' })).toThrow('firstName is required');
  });

  it('throws when lastName is empty', () => {
    expect(() => RepPersonalInfo.create({ ...base, lastName: '' })).toThrow('lastName is required');
  });

  it('throws when email is empty', () => {
    expect(() => RepPersonalInfo.create({ ...base, email: '' })).toThrow('email is required');
  });

  it('stores optional contact fields', () => {
    const info = RepPersonalInfo.create({ ...base, cellPhone: '555-1234', telephone: '555-5678', fax: '555-9012', num800: '800-0000' });
    expect(info.cellPhone).toBe('555-1234');
    expect(info.telephone).toBe('555-5678');
    expect(info.fax).toBe('555-9012');
    expect(info.num800).toBe('800-0000');
  });
});
