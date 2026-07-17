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
   * The relay has no per-request TenantContext, so it can't discover pending events with one
   * cross-tenant query under RLS (see ADR-003) — it must know which tenants to poll ahead of
   * time. OUTBOX_RELAY_TENANT_IDS is an interim, manually-maintained stand-in for a real tenant
   * registry; a tenant missing from this list silently never gets its events relayed.
   */
  private getKnownTenantIds(): string[] {
    return (process.env['OUTBOX_RELAY_TENANT_IDS'] ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }

  /** Single relay pass — polls each known tenant in turn (see ADR-003) and relays its events. */
  async relay(): Promise<void> {
    const tenantIds = this.getKnownTenantIds();
    if (tenantIds.length === 0) {
      console.error('[OutboxRelay] OUTBOX_RELAY_TENANT_IDS is empty — no tenants will be relayed');
      return;
    }

    for (const tenantId of tenantIds) {
      await this.relayForTenant(tenantId);
    }
  }

  /** Discovers and relays one tenant's unpublished events, all scoped via withTenantTransaction. */
  private async relayForTenant(tenantId: string): Promise<void> {
    const events = await this.prisma.withTenantTransaction(tenantId, (tx) =>
      tx.outboxEvent.findMany({
        where: { publishedAt: null, retryCount: { lt: MAX_RETRIES } },
        orderBy: { createdAt: 'asc' },
        take: BATCH_SIZE,
      }),
    );

    for (const event of events) {
      try {
        this.publisher.publish(
          event.eventType,
          event.aggregateId,
          event.occurredAt,
          event.payload as Record<string, unknown>,
        );
        await this.prisma.withTenantTransaction(tenantId, (tx) =>
          tx.outboxEvent.update({
            where: { id: event.id },
            data: { publishedAt: new Date() },
          }),
        );
      } catch (err: unknown) {
        console.error(`[OutboxRelay] Failed to publish event ${event.id} (${event.eventType})`, err);
        await this.prisma.withTenantTransaction(tenantId, (tx) =>
          tx.outboxEvent.update({
            where: { id: event.id },
            data: { retryCount: { increment: 1 } },
          }),
        );
      }
    }
  }
}
