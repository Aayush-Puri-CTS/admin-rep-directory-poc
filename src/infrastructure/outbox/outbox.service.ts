import { Prisma } from '@prisma/client';

export interface OutboxEventRecord {
  tenantId: string;
  eventType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

export class OutboxService {
  async writeAll(events: OutboxEventRecord[], tx: Prisma.TransactionClient): Promise<void> {
    if (events.length === 0) return;
    await tx.outboxEvent.createMany({
      data: events.map((e) => ({
        tenantId: e.tenantId,
        eventType: e.eventType,
        aggregateId: e.aggregateId,
        payload: e.payload as Prisma.InputJsonValue,
        occurredAt: e.occurredAt,
      })),
    });
  }
}
