import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NatsModule } from './adapters/driven/nats/nats.module';
import { RepModule } from './adapters/driving/http/rep.module';
import { TenantMiddleware } from './adapters/driving/http/middleware/tenant.middleware';
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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(TenantMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
