import { Rep } from '../../../domain/entities/rep.entity';
import { RepId } from '../../../domain/value-objects/rep-id.vo';
import { RepPersonalInfo } from '../../../domain/value-objects/rep-personal-info.vo';
import { OutboxService } from '../../../infrastructure/outbox/outbox.service';
import { TenantContext } from '../../../infrastructure/tenant/tenant-context';
import { makeFakeRepRow, makeFakeTenantPrisma } from './fake-tenant-prisma';
import { PrismaRepRepository } from './rep.repository';

function makeRep(overrides: { id?: string; uplineRepId?: RepId | null } = {}): Rep {
  return Rep.create({
    id: RepId.of(overrides.id ?? 'rep-1'),
    personalInfo: RepPersonalInfo.create({ firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' }),
    uplineRepId: overrides.uplineRepId ?? undefined,
  });
}

describe('PrismaRepRepository', () => {
  describe('findById', () => {
    it("returns null when the rep belongs to a different tenant (upline findById under the wrong tenant returns null)", async () => {
      const uplineRow = makeFakeRepRow({ id: 'upline-1', tenantId: 'tenant-a' });
      const { prisma } = makeFakeTenantPrisma([uplineRow]);
      const repo = new PrismaRepRepository(prisma, new OutboxService());

      const result = await TenantContext.run('tenant-b', () => repo.findById(RepId.of('upline-1')));

      expect(result).toBeNull();
    });

    it('returns the rep when the active tenant matches the row', async () => {
      const row = makeFakeRepRow({ id: 'rep-1', tenantId: 'tenant-a' });
      const { prisma } = makeFakeTenantPrisma([row]);
      const repo = new PrismaRepRepository(prisma, new OutboxService());

      const result = await TenantContext.run('tenant-a', () => repo.findById(RepId.of('rep-1')));

      expect(result?.id.value).toBe('rep-1');
    });

    it('throws when called outside a TenantContext.run() scope', async () => {
      const { prisma } = makeFakeTenantPrisma([]);
      const repo = new PrismaRepRepository(prisma, new OutboxService());

      await expect(repo.findById(RepId.of('rep-1'))).rejects.toThrow(/no active tenant/);
    });
  });

  describe('save', () => {
    it('stamps the create payload with the active tenant', async () => {
      const { prisma, reps } = makeFakeTenantPrisma([]);
      const repo = new PrismaRepRepository(prisma, new OutboxService());

      await TenantContext.run('tenant-a', () => repo.save(makeRep()));

      expect(reps.get('rep-1')?.tenantId).toBe('tenant-a');
    });

    it("rejects updating a rep that belongs to a different tenant (no cross-tenant writes)", async () => {
      const existing = makeFakeRepRow({ id: 'rep-1', tenantId: 'tenant-a' });
      const { prisma } = makeFakeTenantPrisma([existing]);
      const repo = new PrismaRepRepository(prisma, new OutboxService());

      await expect(TenantContext.run('tenant-b', () => repo.save(makeRep({ id: 'rep-1' })))).rejects.toThrow(
        /row-level security/,
      );
    });

    it('writes outbox events tagged with the active tenant', async () => {
      const { prisma, outboxEvents } = makeFakeTenantPrisma([]);
      const repo = new PrismaRepRepository(prisma, new OutboxService());

      await TenantContext.run('tenant-a', () => repo.save(makeRep()));

      expect(outboxEvents).toEqual(
        expect.arrayContaining([expect.objectContaining({ tenantId: 'tenant-a', eventType: 'RepCreated' })]),
      );
    });

    it('persists keycloakUserId', async () => {
      const { prisma, reps } = makeFakeTenantPrisma([]);
      const repo = new PrismaRepRepository(prisma, new OutboxService());
      const rep = makeRep();
      rep.linkKeycloakAccount('sub-123');

      await TenantContext.run('tenant-a', () => repo.save(rep));

      expect(reps.get('rep-1')?.keycloakUserId).toBe('sub-123');
    });

    it('rejects reusing a keycloakUserId already linked to another Rep in the same tenant', async () => {
      const existing = makeFakeRepRow({ id: 'rep-1', tenantId: 'tenant-a', keycloakUserId: 'sub-123' });
      const { prisma } = makeFakeTenantPrisma([existing]);
      const repo = new PrismaRepRepository(prisma, new OutboxService());
      const rep = makeRep({ id: 'rep-2' });
      rep.linkKeycloakAccount('sub-123');

      await expect(TenantContext.run('tenant-a', () => repo.save(rep))).rejects.toThrow(/already linked/);
    });

    it('allows the same keycloakUserId for Reps in different tenants', async () => {
      const existing = makeFakeRepRow({ id: 'rep-1', tenantId: 'tenant-a', keycloakUserId: 'sub-123' });
      const { prisma } = makeFakeTenantPrisma([existing]);
      const repo = new PrismaRepRepository(prisma, new OutboxService());
      const rep = makeRep({ id: 'rep-2' });
      rep.linkKeycloakAccount('sub-123');

      await expect(TenantContext.run('tenant-b', () => repo.save(rep))).resolves.toBeUndefined();
    });
  });
});
