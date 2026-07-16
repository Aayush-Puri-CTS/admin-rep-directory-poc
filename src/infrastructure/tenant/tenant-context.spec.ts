import { TenantContext } from './tenant-context';

describe('TenantContext', () => {
  describe('get()', () => {
    it('throws when called outside a run() call', () => {
      expect(() => TenantContext.get()).toThrow(/no active tenant/);
    });

    it('returns the active tenant id inside a run() call', () => {
      TenantContext.run('tenant-a', () => {
        expect(TenantContext.get()).toBe('tenant-a');
      });
    });

    it('does not leak the active tenant id after run() returns', () => {
      TenantContext.run('tenant-a', () => undefined);
      expect(() => TenantContext.get()).toThrow(/no active tenant/);
    });
  });

  describe('getOrNull()', () => {
    it('returns null outside a run() call', () => {
      expect(TenantContext.getOrNull()).toBeNull();
    });

    it('returns the active tenant id inside a run() call', () => {
      TenantContext.run('tenant-b', () => {
        expect(TenantContext.getOrNull()).toBe('tenant-b');
      });
    });
  });

  describe('run()', () => {
    it('isolates concurrent async call chains from each other', async () => {
      const results: string[] = [];
      await Promise.all([
        TenantContext.run('tenant-a', async () => {
          await new Promise((r) => setTimeout(r, 5));
          results.push(TenantContext.get());
        }),
        TenantContext.run('tenant-b', async () => {
          results.push(TenantContext.get());
        }),
      ]);
      expect(results.sort()).toEqual(['tenant-a', 'tenant-b']);
    });
  });
});
