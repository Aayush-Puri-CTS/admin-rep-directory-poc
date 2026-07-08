import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RepModule } from '../../adapters/driving/http/rep.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RepModule,
  ],
})
export class AppModule {}
