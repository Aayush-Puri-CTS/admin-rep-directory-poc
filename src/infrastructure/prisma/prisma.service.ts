import { PrismaClient } from '@prisma/client';
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

  async connect(): Promise<void> {
    await this.client.$connect();
  }

  async disconnect(): Promise<void> {
    await this.client.$disconnect();
    await this.pool.end();
  }
}
