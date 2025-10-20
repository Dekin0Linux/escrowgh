import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class CommisionsService {
    constructor(private readonly db: DatabaseService) { }

    async getCommissions() {
        return [
            { min: 1, max: 49, type: 'percentage', rate: 0 },
            { min: 50, max: 300, type: 'percentage', rate: 5 },
            { min: 301, max: 1000, type: 'percentage', rate: 3.5 },
            { min: 1001, max: 5000, type: 'percentage', rate: 2 },
            { min: 5001, max: Infinity, type: 'flat', rate: 100 },
        ];
    }

    async calculateCommission(amount: number) {
        // REJECT IF NOT AMOUNT IS PASSED
        if (!amount || amount <= 0) {
            throw new BadRequestException('Invalid transaction amount.');
        }

        // GET LIST OF COMMISIONS 
        const commissions = await this.getCommissions();

        // Find the matching range
        const rule = commissions.find(
            (rule) => amount >= rule.min && amount <= rule.max,
        );

        if (!rule) {
            throw new BadRequestException('No commission rule found for this amount.');
        }

        let commissionFee = 0;

        if (rule.type === 'percentage') {
            commissionFee = (rule.rate / 100) * amount;
        } else if (rule.type === 'flat') {
            commissionFee = rule.rate;
        }

        const totalWithCommission = amount + commissionFee;

        return {
            amount,
            commissionFee: +commissionFee.toFixed(2),
            totalPaid: +totalWithCommission.toFixed(2),
            percentage: rule.type === 'flat' ? 'Flat rate' : rule.rate,
            ruleApplied:
                rule.type === 'flat'
                    ? `Flat fee of ₵${rule.rate}`
                    : `${rule.rate}% for ₵${rule.min} - ₵${rule.max}`,
        };

    }
}
