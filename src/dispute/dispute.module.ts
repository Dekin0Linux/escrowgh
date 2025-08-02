import { Module } from '@nestjs/common';
import { DisputeController } from './dispute.controller';
import { DisputeService } from './dispute.service';
import { DatabaseModule } from 'src/database/database.module';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Module({
  imports : [DatabaseModule],
  controllers: [DisputeController],
  providers: [DisputeService,CloudinaryService]
})
export class DisputeModule {}
