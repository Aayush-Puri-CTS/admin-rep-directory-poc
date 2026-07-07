import { NatsEventPublisher } from '../../adapters/driven/nats/nats-event-publisher';
import { PrismaService } from '../prisma/prisma.service';

const MAX_RETRIES = 5;
const BATCH_SIZE = 50;

export class OutboxRelayService {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: NatsEventPublisher,
  ) {}

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

  /** Single relay pass — queries unpublished events, publishes, marks as done or increments retryCount. */
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
        await this.prisma.client.outboxEvent.update({
          where: { id: event.id },
          data: { publishedAt: new Date() },
        });
      } catch (err: unknown) {
        console.error(`[OutboxRelay] Failed to publish event ${event.id} (${event.eventType})`, err);
        await this.prisma.client.outboxEvent.update({
          where: { id: event.id },
          data: { retryCount: { increment: 1 } },
        });
      }
    }
  }
}
