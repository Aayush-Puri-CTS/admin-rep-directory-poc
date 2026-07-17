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

/** eventsByTenant maps a known tenant id to the events findMany should return for it. */
function makePrisma(eventsByTenant: Record<string, FakeOutboxEvent[]>) {
  const update = jest.fn().mockResolvedValue(undefined);
  let currentTenantId = '';
  const findMany = jest.fn(() => Promise.resolve(eventsByTenant[currentTenantId] ?? []));
  const withTenantTransaction = jest.fn((tenantId: string, fn: (tx: unknown) => unknown) => {
    currentTenantId = tenantId;
    return fn({ outboxEvent: { findMany, update } });
  });
  return {
    prisma: { withTenantTransaction } as unknown as PrismaService,
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

const ENV_KEY = 'OUTBOX_RELAY_TENANT_IDS';
const originalEnv = process.env[ENV_KEY];

function setKnownTenantIds(...tenantIds: string[]): void {
  process.env[ENV_KEY] = tenantIds.join(',');
}

describe('OutboxRelayService.relay()', () => {
  afterEach(() => {
    if (originalEnv === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = originalEnv;
  });

  it('logs and does nothing when OUTBOX_RELAY_TENANT_IDS is empty', async () => {
    delete process.env[ENV_KEY];
    const { prisma, withTenantTransaction } = makePrisma({});
    const { publisher, publish } = makePublisher();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await new OutboxRelayService(prisma, publisher).relay();

    expect(withTenantTransaction).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('OUTBOX_RELAY_TENANT_IDS is empty'));
    errorSpy.mockRestore();
  });

  it('queries for unpublished events below MAX_RETRIES, scoped to the known tenant', async () => {
    setKnownTenantIds('tenant-1');
    const { prisma, findMany, withTenantTransaction } = makePrisma({ 'tenant-1': [] });
    const { publisher } = makePublisher();
    await new OutboxRelayService(prisma, publisher).relay();
    expect(withTenantTransaction).toHaveBeenCalledWith('tenant-1', expect.any(Function));
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { publishedAt: null, retryCount: { lt: 5 } },
      }),
    );
  });

  it('publishes each event with correct arguments', async () => {
    setKnownTenantIds('tenant-1');
    const event = makeEvent();
    const { prisma } = makePrisma({ 'tenant-1': [event] });
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
    setKnownTenantIds('tenant-1');
    const { prisma, update } = makePrisma({ 'tenant-1': [makeEvent()] });
    const { publisher } = makePublisher();
    await new OutboxRelayService(prisma, publisher).relay();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ publishedAt: expect.any(Date) }) }),
    );
  });

  it('increments retryCount on publish failure', async () => {
    setKnownTenantIds('tenant-1');
    const { prisma, update } = makePrisma({ 'tenant-1': [makeEvent()] });
    const { publisher } = makePublisher(true);
    await new OutboxRelayService(prisma, publisher).relay();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { retryCount: { increment: 1 } } }),
    );
  });

  it('does not set publishedAt on publish failure', async () => {
    setKnownTenantIds('tenant-1');
    const { prisma, update } = makePrisma({ 'tenant-1': [makeEvent()] });
    const { publisher } = makePublisher(true);
    await new OutboxRelayService(prisma, publisher).relay();
    const callArg = (update as jest.Mock).mock.calls[0][0];
    expect(callArg.data).not.toHaveProperty('publishedAt');
  });

  it('continues processing remaining events after one failure', async () => {
    setKnownTenantIds('tenant-1');
    const { prisma, update } = makePrisma({
      'tenant-1': [makeEvent({ id: 'evt-1' }), makeEvent({ id: 'evt-2' })],
    });
    const publish = jest.fn()
      .mockImplementationOnce(() => { throw new Error('fail'); })
      .mockImplementationOnce(() => undefined);
    const publisher = { publish } as unknown as NatsEventPublisher;
    await new OutboxRelayService(prisma, publisher).relay();
    expect(update).toHaveBeenCalledTimes(2);
  });

  it('does nothing when there are no unpublished events', async () => {
    setKnownTenantIds('tenant-1');
    const { prisma } = makePrisma({ 'tenant-1': [] });
    const { publisher, publish } = makePublisher();
    await new OutboxRelayService(prisma, publisher).relay();
    expect(publish).not.toHaveBeenCalled();
  });

  it('polls every known tenant, scoping each discovery and update to that tenant', async () => {
    setKnownTenantIds('tenant-a', 'tenant-b');
    const eventA = makeEvent({ id: 'evt-a', tenantId: 'tenant-a' });
    const eventB = makeEvent({ id: 'evt-b', tenantId: 'tenant-b' });
    const { prisma, withTenantTransaction, findMany } = makePrisma({
      'tenant-a': [eventA],
      'tenant-b': [eventB],
    });
    const { publisher, publish } = makePublisher();

    await new OutboxRelayService(prisma, publisher).relay();

    expect(withTenantTransaction).toHaveBeenCalledWith('tenant-a', expect.any(Function));
    expect(withTenantTransaction).toHaveBeenCalledWith('tenant-b', expect.any(Function));
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(publish).toHaveBeenCalledTimes(2);
  });

  it("does not let one tenant's events leak into another's relay pass", async () => {
    setKnownTenantIds('tenant-a', 'tenant-b');
    const eventA = makeEvent({ id: 'evt-a', tenantId: 'tenant-a' });
    const { prisma } = makePrisma({ 'tenant-a': [eventA], 'tenant-b': [] });
    const { publisher, publish } = makePublisher();

    await new OutboxRelayService(prisma, publisher).relay();

    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith('RepCreated', 'rep-1', eventA.occurredAt, eventA.payload);
  });
});
