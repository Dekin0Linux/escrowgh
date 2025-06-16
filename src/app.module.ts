import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TransactionModule } from './transaction/transaction.module';
import { PaymentModule } from './payment/payment.module';
import { UserModule } from './user/user.module';
import { DisputeModule } from './dispute/dispute.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [TransactionModule, PaymentModule, UserModule, DisputeModule, DatabaseModule,DatabaseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
