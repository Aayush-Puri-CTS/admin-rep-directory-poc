import { NatsEventPublisher } from './nats-event-publisher';

function makeConnection() {
  return { publish: jest.fn(), drain: jest.fn().mockResolvedValue(undefined) };
}

function makePublisher(connection: ReturnType<typeof makeConnection>): NatsEventPublisher {
  const publisher = new NatsEventPublisher();
  // Inject a mock connection directly via the private field
  (publisher as unknown as { connection: unknown }).connection = connection;
  return publisher;
}

describe('NatsEventPublisher', () => {
  describe('publish()', () => {
    it('publishes to the mapped subject for known event types', () => {
      const conn = makeConnection();
      const publisher = makePublisher(conn);
      publisher.publish('RepCreated', 'rep-1', new Date(), {});
      expect(conn.publish).toHaveBeenCalledWith(
        'admin.rep.created',
        expect.any(Uint8Array),
      );
    });

    it('falls back to admin.events.<eventType> for unknown event types', () => {
      const conn = makeConnection();
      const publisher = makePublisher(conn);
      publisher.publish('SomeUnknownEvent', 'rep-1', new Date(), {});
      expect(conn.publish).toHaveBeenCalledWith(
        'admin.events.SomeUnknownEvent',
        expect.any(Uint8Array),
      );
    });

    it('throws when not connected', () => {
      const publisher = new NatsEventPublisher();
      expect(() => publisher.publish('RepCreated', 'rep-1', new Date(), {})).toThrow(
        'not connected',
      );
    });

    it('uses the correct subject for each known event type', () => {
      const cases: [string, string][] = [
        ['RepCreated', 'admin.rep.created'],
        ['RepPersonalInfoUpdated', 'admin.rep.personal-info-updated'],
        ['RepBusinessInfoUpdated', 'admin.rep.business-info-updated'],
        ['RepSoftDeleted', 'admin.rep.soft-deleted'],
        ['RepRestored', 'admin.rep.restored'],
        ['RepGroupLinked', 'admin.rep.group-linked'],
      ];
      for (const [eventType, expectedSubject] of cases) {
        const conn = makeConnection();
        makePublisher(conn).publish(eventType, 'rep-1', new Date(), {});
        expect(conn.publish).toHaveBeenCalledWith(expectedSubject, expect.any(Uint8Array));
      }
    });
  });

  describe('isConnected()', () => {
    it('returns true when connection is set', () => {
      expect(makePublisher(makeConnection()).isConnected()).toBe(true);
    });

    it('returns false when not connected', () => {
      expect(new NatsEventPublisher().isConnected()).toBe(false);
    });
  });
});
