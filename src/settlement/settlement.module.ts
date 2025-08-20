import { Module } from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { SettlementController } from './settlement.controller';
import { DatabaseService } from 'src/database/database.service';

@Module({
  providers: [SettlementService, DatabaseService],
  controllers: [SettlementController]
})
export class SettlementModule {}
