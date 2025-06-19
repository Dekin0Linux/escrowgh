import { Module } from '@nestjs/common';
import { CommisionsService } from './commisions.service';
import { CommisionsController } from './commisions.controller';

@Module({
  providers: [CommisionsService],
  controllers: [CommisionsController]
})
export class CommisionsModule {}
