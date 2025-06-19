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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 👈 makes env vars available app-wide
    }),
    TransactionModule,
    PaymentModule,
    UserModule,
    DisputeModule,
    DatabaseModule,
    AuthModule,
    CommisionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
