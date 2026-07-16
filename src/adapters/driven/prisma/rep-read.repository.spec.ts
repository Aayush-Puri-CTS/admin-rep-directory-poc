import { TenantContext } from '../../../infrastructure/tenant/tenant-context';
import { makeFakeRepRow, makeFakeTenantPrisma } from './fake-tenant-prisma';
import { PrismaRepReadRepository } from './rep-read.repository';

describe('PrismaRepReadRepository', () => {
  const tenantARep = makeFakeRepRow({ id: 'rep-a', tenantId: 'tenant-a', firstName: 'Alice' });
  const tenantBRep = makeFakeRepRow({ id: 'rep-b', tenantId: 'tenant-b', firstName: 'Bob' });

  describe('findById', () => {
    it("tenant A cannot read tenant B's row by id", async () => {
      const { prisma } = makeFakeTenantPrisma([tenantARep, tenantBRep]);
      const repo = new PrismaRepReadRepository(prisma);

      const result = await TenantContext.run('tenant-a', () => repo.findById('rep-b'));

      expect(result).toBeNull();
    });

    it('tenant A can read its own row by id', async () => {
      const { prisma } = makeFakeTenantPrisma([tenantARep, tenantBRep]);
      const repo = new PrismaRepReadRepository(prisma);

      const result = await TenantContext.run('tenant-a', () => repo.findById('rep-a'));

      expect(result?.repId).toBe('rep-a');
    });
  });

  describe('search', () => {
    it("excludes tenant B's reps from tenant A's search results", async () => {
      const { prisma } = makeFakeTenantPrisma([tenantARep, tenantBRep]);
      const repo = new PrismaRepReadRepository(prisma);

      const results = await TenantContext.run('tenant-a', () => repo.search({}));

      expect(results.map((r) => r.repId)).toEqual(['rep-a']);
    });
  });

  describe('findDirectory', () => {
    it("counts and lists only the active tenant's reps", async () => {
      const { prisma } = makeFakeTenantPrisma([tenantARep, tenantBRep]);
      const repo = new PrismaRepReadRepository(prisma);

      const page = await TenantContext.run('tenant-a', () => repo.findDirectory({ page: 1, pageSize: 20 }));

      expect(page.total).toBe(1);
      expect(page.items.map((r) => r.repId)).toEqual(['rep-a']);
    });
  });
});
