import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { DatabaseModule } from 'src/database/database.module';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { NotificationService } from 'src/notification/notification.service';

@Module({
  imports: [DatabaseModule],
  controllers: [TransactionController],
  providers: [TransactionService,CloudinaryService,NotificationService]
})
export class TransactionModule {}
