export enum RepStatus {
  /** Newly created Rep; awaiting admin approval before operating. */
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  /** Approved; Rep can operate normally. */
  ACTIVE = 'ACTIVE',
  /** Temporarily blocked by admin (e.g. compliance hold). */
  SUSPENDED = 'SUSPENDED',
  /** Deactivated but data is retained; recoverable via restore(). */
  SOFT_DELETED = 'SOFT_DELETED',
}
