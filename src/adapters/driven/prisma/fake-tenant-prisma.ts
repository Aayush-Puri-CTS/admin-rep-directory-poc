import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

/**
 * In-memory stand-in for PrismaService.withTenantTransaction that filters every
 * read by the tenantId passed to withTenantTransaction, the same way the real
 * tenant_isolation RLS policy filters by current_setting('app.current_tenant_id').
 * Used to test repository tenant-scoping without a live Postgres connection.
 */
export interface FakeRepRow {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  email: string;
  cellPhone: string | null;
  telephone: string | null;
  fax: string | null;
  num800: string | null;
  dateOfBirth: Date | null;
  ssn: string | null;
  businessName: string | null;
  businessTaxId: string | null;
  businessEmail: string | null;
  status: string;
  repType: string | null;
  bio: string | null;
  isEliteBlue: boolean;
  uplineRepId: string | null;
  keycloakUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function makeFakeRepRow(overrides: Partial<FakeRepRow> = {}): FakeRepRow {
  return {
    id: 'rep-1',
    tenantId: 'tenant-a',
    firstName: 'Alice',
    lastName: 'Smith',
    middleName: null,
    email: 'alice@example.com',
    cellPhone: null,
    telephone: null,
    fax: null,
    num800: null,
    dateOfBirth: null,
    ssn: null,
    businessName: null,
    businessTaxId: null,
    businessEmail: null,
    status: 'PENDING_APPROVAL',
    repType: null,
    bio: null,
    isEliteBlue: false,
    uplineRepId: null,
    keycloakUserId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

export function makeFakeTenantPrisma(seedReps: FakeRepRow[] = []) {
  const reps = new Map(seedReps.map((r) => [r.id, r]));
  const platformAccess: Array<{ tenantId: string; repId: string; platform: string; accessType: string }> = [];
  const outboxEvents: Array<Record<string, unknown>> = [];

  function scopedTx(tenantId: string) {
    return {
      rep: {
        findUnique: async ({ where }: { where: { id: string } }) => {
          const row = reps.get(where.id);
          return row && row.tenantId === tenantId ? { ...row, platformAccess: [] } : null;
        },
        findMany: async () =>
          Array.from(reps.values())
            .filter((r) => r.tenantId === tenantId)
            .map((r) => ({ ...r, platformAccess: [] })),
        findFirst: async ({ where }: { where: { keycloakUserId?: string | null } }) => {
          const row = Array.from(reps.values()).find(
            (r) => r.tenantId === tenantId && r.keycloakUserId === where.keycloakUserId,
          );
          return row ? { id: row.id } : null;
        },
        count: async () => Array.from(reps.values()).filter((r) => r.tenantId === tenantId).length,
        upsert: async ({
          where,
          create,
          update,
        }: {
          where: { id: string };
          create: Record<string, unknown>;
          update: Record<string, unknown>;
        }) => {
          const existing = reps.get(where.id);
          // Mirrors the tenant_isolation policy's WITH CHECK: an UPDATE that would
          // touch a row outside the active tenant is rejected, not silently applied.
          if (existing && existing.tenantId !== tenantId) {
            throw new Error('row-level security policy violation on "reps"');
          }
          const nextKeycloakUserId = (update.keycloakUserId ?? create.keycloakUserId) as
            | string
            | null
            | undefined;
          if (nextKeycloakUserId != null) {
            const conflict = Array.from(reps.values()).find(
              (r) =>
                r.id !== where.id &&
                r.tenantId === tenantId &&
                r.keycloakUserId === nextKeycloakUserId,
            );
            if (conflict) {
              const error = new Error(
                'Unique constraint failed on the fields: (`tenantId`,`keycloakUserId`)',
              ) as Error & { code: string; meta: { target: string[] } };
              error.code = 'P2002';
              error.meta = { target: ['tenantId', 'keycloakUserId'] };
              throw error;
            }
          }
          const row = (existing ? { ...existing, ...update } : { ...create, tenantId }) as FakeRepRow;
          reps.set(where.id, row);
          return row;
        },
      },
      repPlatformAccess: {
        deleteMany: async () => undefined,
        createMany: async ({ data }: { data: Array<{ tenantId: string; repId: string; platform: string; accessType: string }> }) => {
          platformAccess.push(...data);
        },
      },
      outboxEvent: {
        createMany: async ({ data }: { data: Array<Record<string, unknown>> }) => {
          outboxEvents.push(...data);
        },
      },
    };
  }

  const withTenantTransaction = jest.fn((tenantId: string, fn: (tx: ReturnType<typeof scopedTx>) => unknown) =>
    fn(scopedTx(tenantId)),
  );

  return {
    prisma: { withTenantTransaction } as unknown as PrismaService,
    reps,
    platformAccess,
    outboxEvents,
  };
}
