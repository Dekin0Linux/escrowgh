import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // 👈 import config module
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TransactionModule } from './transaction/transaction.module';
import { PaymentModule } from './payment/payment.module';
import { UserModule } from './user/user.module';
import { DisputeModule } from './dispute/dispute.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { CommisionsModule } from './commisions/commisions.module';
import { SettlementModule } from './settlement/settlement.module';
import { CloudinaryService } from './cloudinary/cloudinary.service';
import { NotificationService } from './notification/notification.service';
import { NotificationController } from './notification/notification.controller';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 👈 makes env vars available app-wide
    }),
    ThrottlerModule.forRoot([{
      ttl: 60,          // time-to-live in seconds
      limit: 10,        // max requests per ttl
    }]),
    TransactionModule,
    PaymentModule,
    UserModule,
    DisputeModule,
    DatabaseModule,
    AuthModule,
    CommisionsModule,
    SettlementModule,
  ],
  controllers: [AppController, NotificationController],
  providers: [AppService, CloudinaryService, NotificationService],
})
export class AppModule {}
