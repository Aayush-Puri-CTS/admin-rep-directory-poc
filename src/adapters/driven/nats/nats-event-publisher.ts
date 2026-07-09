// NOTE: nats@2.x is deprecated upstream — migrate to @nats-io/transport-node when upgrading.
// ⚠️ NATS subject names below are a Tier D contract. Confirm with Lead/Architect and any
//    consuming teams before any other service takes a dependency on these subjects.
import { Injectable } from '@nestjs/common';
import { connect, JSONCodec, NatsConnection } from 'nats';
import { IEventPublisher } from '../../../domain/ports/event-publisher.port';

export interface NatsMessage {
  eventType: string;
  aggregateId: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

const SUBJECT_MAP: Record<string, string> = {
  RepCreated: 'admin.rep.created',
  RepPersonalInfoUpdated: 'admin.rep.personal-info-updated',
  RepBusinessInfoUpdated: 'admin.rep.business-info-updated',
  RepApproved: 'admin.rep.approved',
  RepSuspended: 'admin.rep.suspended',
  RepSoftDeleted: 'admin.rep.soft-deleted',
  RepRestored: 'admin.rep.restored',
  RepGroupLinked: 'admin.rep.group-linked',
};

@Injectable()
export class NatsEventPublisher implements IEventPublisher {
  private connection: NatsConnection | null = null;
  private readonly jc = JSONCodec<NatsMessage>();

  async connect(url: string): Promise<void> {
    this.connection = await connect({ servers: url });
  }

  async disconnect(): Promise<void> {
    await this.connection?.drain();
    this.connection = null;
  }

  publish(eventType: string, aggregateId: string, occurredAt: Date, payload: Record<string, unknown>): void {
    if (!this.connection) {
      throw new Error('NatsEventPublisher: not connected — call connect() before publish()');
    }
    const subject = SUBJECT_MAP[eventType] ?? `admin.events.${eventType}`;
    const message: NatsMessage = {
      eventType,
      aggregateId,
      occurredAt: occurredAt.toISOString(),
      payload,
    };
    this.connection.publish(subject, this.jc.encode(message));
  }

  isConnected(): boolean {
    return this.connection !== null;
  }
}
