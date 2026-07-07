/**
 * Platforms derived from matrix actions:
 *   "Check Enrollprime Downline Rep Access" → ENROLLPRIME
 *   "Check Extra Health Rep Access"         → EXTRA_HEALTH
 *   "Assure Health Reps"                    → ASSURE_HEALTH
 */
export enum RepPlatform {
  ENROLLPRIME = 'ENROLLPRIME',
  EXTRA_HEALTH = 'EXTRA_HEALTH',
  ASSURE_HEALTH = 'ASSURE_HEALTH',
}

/** Binary flag confirmed by "Check [platform] Downline Rep Access" naming pattern. */
export enum PlatformAccessType {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
}

export interface PlatformAccess {
  platform: RepPlatform;
  accessType: PlatformAccessType;
}

export class AccessControl {
  private readonly permissions: ReadonlyMap<RepPlatform, PlatformAccessType>;

  private constructor(entries: PlatformAccess[]) {
    this.permissions = new Map(entries.map((e) => [e.platform, e.accessType]));
  }

  static create(entries: PlatformAccess[]): AccessControl {
    return new AccessControl(entries);
  }

  /** All platforms default to DISABLED for new Reps. */
  static defaultForNewRep(): AccessControl {
    return new AccessControl(
      Object.values(RepPlatform).map((platform) => ({
        platform,
        accessType: PlatformAccessType.DISABLED,
      })),
    );
  }

  getAccess(platform: RepPlatform): PlatformAccessType {
    return this.permissions.get(platform) ?? PlatformAccessType.DISABLED;
  }

  hasAccess(platform: RepPlatform): boolean {
    return this.getAccess(platform) === PlatformAccessType.ENABLED;
  }

  /** Returns a new AccessControl with the given platform overridden. */
  with(platform: RepPlatform, accessType: PlatformAccessType): AccessControl {
    const existing = Array.from(this.permissions.entries()).map(([p, a]) => ({
      platform: p,
      accessType: p === platform ? accessType : a,
    }));
    if (!this.permissions.has(platform)) {
      existing.push({ platform, accessType });
    }
    return new AccessControl(existing);
  }

  toArray(): PlatformAccess[] {
    return Array.from(this.permissions.entries()).map(([platform, accessType]) => ({
      platform,
      accessType,
    }));
  }
}
