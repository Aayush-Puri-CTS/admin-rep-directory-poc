export const EVENT_PUBLISHER_TOKEN = 'IEventPublisher';

export interface IEventPublisher {
  publish(
    eventType: string,
    aggregateId: string,
    occurredAt: Date,
    payload: Record<string, unknown>,
  ): void;
}
