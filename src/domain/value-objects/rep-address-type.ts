/**
 * Address categories for a Rep.
 * Derived from standard insurance back-office address types; the matrix uses a
 * free-text `type` field — this enum enforces consistency at the domain layer.
 */
export enum RepAddressType {
  MAILING = 'MAILING',
  BUSINESS = 'BUSINESS',
  HOME = 'HOME',
  BILLING = 'BILLING',
}
