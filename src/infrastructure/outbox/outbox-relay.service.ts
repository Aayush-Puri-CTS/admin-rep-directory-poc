import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EVENT_PUBLISHER_TOKEN, IEventPublisher } from '../../domain/ports/event-publisher.port';
import { PrismaService } from '../prisma/prisma.service';

const MAX_RETRIES = 5;
const BATCH_SIZE = 50;

@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EVENT_PUBLISHER_TOKEN) private readonly publisher: IEventPublisher,
  ) {}

  onModuleInit(): void {
    this.start();
  }

  onModuleDestroy(): void {
    this.stop();
  }

  /** Start polling. intervalMs defaults to 5 000 ms; override via OUTBOX_POLL_INTERVAL_MS env var. */
  start(intervalMs?: number): void {
    const ms = intervalMs ?? Number(process.env['OUTBOX_POLL_INTERVAL_MS'] ?? 5000);
    this.timer = setInterval(() => {
      this.relay().catch((err: unknown) => {
        console.error('[OutboxRelay] Unhandled relay error', err);
      });
    }, ms);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Single relay pass — queries unpublished events, publishes, marks as done or increments retryCount.
   *
   * The discovery query below runs across all tenants (the relay has no per-request tenant, so
   * there is no TenantContext to scope it to) and therefore must run on a connection/role that
   * isn't blocked by the tenant_isolation RLS policy for outbox_events. Once an event is in hand,
   * every subsequent write for it goes through withTenantTransaction(event.tenantId, ...) so the
   * RLS policy still fires and cross-tenant writes are impossible even if event.tenantId were ever
   * wrong.
   */
  async relay(): Promise<void> {
    const events = await this.prisma.client.outboxEvent.findMany({
      where: { publishedAt: null, retryCount: { lt: MAX_RETRIES } },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
    });

    for (const event of events) {
      try {
        this.publisher.publish(
          event.eventType,
          event.aggregateId,
          event.occurredAt,
          event.payload as Record<string, unknown>,
        );
        await this.prisma.withTenantTransaction(event.tenantId, (tx) =>
          tx.outboxEvent.update({
            where: { id: event.id },
            data: { publishedAt: new Date() },
          }),
        );
      } catch (err: unknown) {
        console.error(`[OutboxRelay] Failed to publish event ${event.id} (${event.eventType})`, err);
        await this.prisma.withTenantTransaction(event.tenantId, (tx) =>
          tx.outboxEvent.update({
            where: { id: event.id },
            data: { retryCount: { increment: 1 } },
          }),
        );
      }
    }
  }
}
