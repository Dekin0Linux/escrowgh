import { Module } from '@nestjs/common';
import { DisputeController } from './dispute.controller';
import { DisputeService } from './dispute.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports : [DatabaseModule],
  controllers: [DisputeController],
  providers: [DisputeService]
})
export class DisputeModule {}
