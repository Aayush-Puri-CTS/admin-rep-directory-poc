import { Global, Injectable, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EVENT_PUBLISHER_TOKEN } from '../../../domain/ports/event-publisher.port';
import { NatsEventPublisher } from './nats-event-publisher';

@Injectable()
class NatsInitService implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly publisher: NatsEventPublisher,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('NATS_URL') ?? 'nats://localhost:4222';
    await this.publisher.connect(url);
    console.log(`[NatsModule] Connected to NATS at ${url}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.publisher.disconnect();
  }
}

@Global()
@Module({
  providers: [
    NatsEventPublisher,
    NatsInitService,
    { provide: EVENT_PUBLISHER_TOKEN, useExisting: NatsEventPublisher },
  ],
  exports: [NatsEventPublisher, EVENT_PUBLISHER_TOKEN],
})
export class NatsModule {}
