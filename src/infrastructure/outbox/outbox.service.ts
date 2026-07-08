import { Prisma } from '@prisma/client';

export interface OutboxEventRecord {
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
        eventType: e.eventType,
        aggregateId: e.aggregateId,
        payload: e.payload as Prisma.InputJsonValue,
        occurredAt: e.occurredAt,
      })),
    });
  }
}
