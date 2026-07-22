export enum GroupStatus {
  /** Newly created/registered Group; awaiting admin approval before operating. */
  PENDING = 'PENDING',
  /** Approved; Group operates normally. */
  ACTIVE = 'ACTIVE',
  /** Temporarily blocked by admin. */
  SUSPENDED = 'SUSPENDED',
  /** Deactivated but data is retained; recoverable via restore(). */
  SOFT_DELETED = 'SOFT_DELETED',
}
