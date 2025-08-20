import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class SettlementService {
    constructor(private readonly db: DatabaseService) {}

    async getAllSettlements() {
        try {
            return this.db.settlement.findMany({});
        } catch (error) {
            throw new InternalServerErrorException('Failed to get settlements.', error);
        }
    }
}
