import { GroupContact } from './group-contact.vo';

const base = { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' };

describe('GroupContact', () => {
  it('creates with required fields only', () => {
    const contact = GroupContact.create(base);
    expect(contact.firstName).toBe('Jane');
    expect(contact.lastName).toBe('Doe');
    expect(contact.email).toBe('jane@example.com');
    expect(contact.phone).toBeUndefined();
    expect(contact.fax).toBeUndefined();
  });

  it('trims required fields', () => {
    const contact = GroupContact.create({ firstName: ' Jane ', lastName: ' Doe ', email: ' jane@example.com ' });
    expect(contact.firstName).toBe('Jane');
    expect(contact.lastName).toBe('Doe');
    expect(contact.email).toBe('jane@example.com');
  });

  it('throws when firstName is empty', () => {
    expect(() => GroupContact.create({ ...base, firstName: '' })).toThrow('firstName is required');
  });

  it('throws when firstName is whitespace only', () => {
    expect(() => GroupContact.create({ ...base, firstName: '   ' })).toThrow('firstName is required');
  });

  it('throws when lastName is empty', () => {
    expect(() => GroupContact.create({ ...base, lastName: '' })).toThrow('lastName is required');
  });

  it('throws when email is empty', () => {
    expect(() => GroupContact.create({ ...base, email: '' })).toThrow('email is required');
  });

  it('stores optional phone and fax when provided', () => {
    const contact = GroupContact.create({ ...base, phone: ' 555-1234 ', fax: ' 555-9012 ' });
    expect(contact.phone).toBe('555-1234');
    expect(contact.fax).toBe('555-9012');
  });

  it('normalizes whitespace-only phone and fax to undefined', () => {
    const contact = GroupContact.create({ ...base, phone: '   ', fax: '   ' });
    expect(contact.phone).toBeUndefined();
    expect(contact.fax).toBeUndefined();
  });

  it('accepts undefined phone and fax', () => {
    const contact = GroupContact.create({ ...base, phone: undefined, fax: undefined });
    expect(contact.phone).toBeUndefined();
    expect(contact.fax).toBeUndefined();
  });

  it('exposes readonly fields (compile-time immutability)', () => {
    const contact = GroupContact.create(base);
    // @ts-expect-error readonly assignment must not compile
    const attemptAssign = () => (contact.firstName = 'Changed');
    expect(typeof attemptAssign).toBe('function');
  });
});
