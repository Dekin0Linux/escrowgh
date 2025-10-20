import { Module } from '@nestjs/common';
import { CommisionsService } from './commisions.service';
import { CommisionsController } from './commisions.controller';
import { DatabaseService } from 'src/database/database.service';

@Module({
  providers: [CommisionsService, DatabaseService],
  controllers: [CommisionsController]
})
export class CommisionsModule {}
