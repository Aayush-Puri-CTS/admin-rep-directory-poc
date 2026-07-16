import { NatsEventPublisher } from '../../adapters/driven/nats/nats-event-publisher';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxRelayService } from './outbox-relay.service';

interface FakeOutboxEvent {
  id: string;
  tenantId: string;
  eventType: string;
  aggregateId: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
  publishedAt: null;
  retryCount: number;
}

function makeEvent(overrides: Partial<FakeOutboxEvent> = {}): FakeOutboxEvent {
  return {
    id: 'evt-1',
    tenantId: 'tenant-1',
    eventType: 'RepCreated',
    aggregateId: 'rep-1',
    occurredAt: new Date('2025-01-01'),
    payload: { firstName: 'Alice' },
    publishedAt: null,
    retryCount: 0,
    ...overrides,
  };
}

function makePrisma(events: FakeOutboxEvent[]) {
  const update = jest.fn().mockResolvedValue(undefined);
  const findMany = jest.fn().mockResolvedValue(events);
  const withTenantTransaction = jest.fn((_tenantId: string, fn: (tx: unknown) => unknown) =>
    fn({ outboxEvent: { update } }),
  );
  return {
    prisma: {
      client: { outboxEvent: { findMany, update } },
      withTenantTransaction,
    } as unknown as PrismaService,
    update,
    findMany,
    withTenantTransaction,
  };
}

function makePublisher(shouldThrow = false) {
  const publish = shouldThrow
    ? jest.fn().mockImplementation(() => { throw new Error('NATS down'); })
    : jest.fn();
  return {
    publisher: { publish } as unknown as NatsEventPublisher,
    publish,
  };
}

describe('OutboxRelayService.relay()', () => {
  it('queries for unpublished events below MAX_RETRIES', async () => {
    const { prisma, findMany } = makePrisma([]);
    const { publisher } = makePublisher();
    await new OutboxRelayService(prisma, publisher).relay();
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { publishedAt: null, retryCount: { lt: 5 } },
      }),
    );
  });

  it('publishes each event with correct arguments', async () => {
    const event = makeEvent();
    const { prisma } = makePrisma([event]);
    const { publisher, publish } = makePublisher();
    await new OutboxRelayService(prisma, publisher).relay();
    expect(publish).toHaveBeenCalledWith(
      'RepCreated',
      'rep-1',
      event.occurredAt,
      event.payload,
    );
  });

  it('sets publishedAt on success', async () => {
    const { prisma, update } = makePrisma([makeEvent()]);
    const { publisher } = makePublisher();
    await new OutboxRelayService(prisma, publisher).relay();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ publishedAt: expect.any(Date) }) }),
    );
  });

  it('increments retryCount on publish failure', async () => {
    const { prisma, update } = makePrisma([makeEvent()]);
    const { publisher } = makePublisher(true);
    await new OutboxRelayService(prisma, publisher).relay();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { retryCount: { increment: 1 } } }),
    );
  });

  it('does not set publishedAt on publish failure', async () => {
    const { prisma, update } = makePrisma([makeEvent()]);
    const { publisher } = makePublisher(true);
    await new OutboxRelayService(prisma, publisher).relay();
    const callArg = (update as jest.Mock).mock.calls[0][0];
    expect(callArg.data).not.toHaveProperty('publishedAt');
  });

  it('continues processing remaining events after one failure', async () => {
    const { prisma, update } = makePrisma([makeEvent({ id: 'evt-1' }), makeEvent({ id: 'evt-2' })]);
    const publish = jest.fn()
      .mockImplementationOnce(() => { throw new Error('fail'); })
      .mockImplementationOnce(() => undefined);
    const publisher = { publish } as unknown as NatsEventPublisher;
    await new OutboxRelayService(prisma, publisher).relay();
    expect(update).toHaveBeenCalledTimes(2);
  });

  it('does nothing when there are no unpublished events', async () => {
    const { prisma } = makePrisma([]);
    const { publisher, publish } = makePublisher();
    await new OutboxRelayService(prisma, publisher).relay();
    expect(publish).not.toHaveBeenCalled();
  });

  it('scopes each update to the event\'s own tenant, not a shared/global context', async () => {
    const eventA = makeEvent({ id: 'evt-a', tenantId: 'tenant-a' });
    const eventB = makeEvent({ id: 'evt-b', tenantId: 'tenant-b' });
    const { prisma, withTenantTransaction } = makePrisma([eventA, eventB]);
    const { publisher } = makePublisher();
    await new OutboxRelayService(prisma, publisher).relay();
    expect(withTenantTransaction).toHaveBeenCalledWith('tenant-a', expect.any(Function));
    expect(withTenantTransaction).toHaveBeenCalledWith('tenant-b', expect.any(Function));
  });
});
