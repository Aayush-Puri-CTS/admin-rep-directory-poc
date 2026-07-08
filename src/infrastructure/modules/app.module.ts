import { Module } from '@nestjs/common';
import { RepModule } from '../../adapters/driving/http/rep.module';

@Module({
  imports: [RepModule],
})
export class AppModule {}
