import { AsyncLocalStorage } from 'async_hooks';

const tenantStorage = new AsyncLocalStorage<string>();

export const TenantContext = {
  /**
   * Run `fn` with `tenantId` active for the entire async call chain.
   * Called by TenantMiddleware once per request.
   */
  run<T>(tenantId: string, fn: () => T): T {
    return tenantStorage.run(tenantId, fn);
  },

  /**
   * Returns the active tenant ID or throws if no tenant context is set.
   * Called by PrismaService.withTenantTransaction() and OutboxRelayService.
   */
  get(): string {
    const id = tenantStorage.getStore();
    if (!id) {
      throw new Error(
        'TenantContext: no active tenant — ensure TenantMiddleware is registered and ' +
          'X-Tenant-Id is present on the request',
      );
    }
    return id;
  },

  /** Returns the active tenant ID or null. Safe to call outside a request context. */
  getOrNull(): string | null {
    return tenantStorage.getStore() ?? null;
  },
};
