import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Successfully connected to the database.');
    } catch (err: any) {
      this.logger.error('❌ Database connection failed.');

      // Prisma's known connection error code
      if (err.code === 'P1001') {
        this.logger.error(
          `Cannot reach the database at ${process.env.DATABASE_URL}. Please check:
          - Internet connection
          - Neon/Postgres access settings
          - DATABASE_URL validity`
        );
      } else {
        this.logger.error(`Unhandled database error: ${err.message}`);
      }

      // Re-throw to stop the app
      throw new Error('Database initialization failed. Check logs for details.');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🧹 Disconnected from database.');
  }
}
