import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NatsModule } from './adapters/driven/nats/nats.module';
import { RepModule } from './adapters/driving/http/rep.module';
import { OutboxModule } from './infrastructure/outbox/outbox.module';
import { PrismaModule } from './infrastructure/modules/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    NatsModule,
    OutboxModule,
    RepModule,
  ],
})
export class AppModule {}
