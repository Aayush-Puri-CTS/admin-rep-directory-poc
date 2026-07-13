import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

export class PrismaService {
  readonly client: PrismaClient;
  private readonly pool: Pool;

  constructor() {
    this.pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
    const adapter = new PrismaPg(this.pool);
    this.client = new PrismaClient({ adapter });
  }

  /**
   * Opens a transaction, sets `app.current_tenant_id` via SET LOCAL (scoped to
   * this transaction only — safe with PgBouncer in transaction mode), then calls fn.
   * All repository writes must go through this method so RLS policies fire correctly.
   */
  async withTenantTransaction<T>(
    tenantId: string,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
      return fn(tx);
    });
  }

  async connect(): Promise<void> {
    await this.client.$connect();
  }

  async disconnect(): Promise<void> {
    await this.client.$disconnect();
    await this.pool.end();
  }
}
