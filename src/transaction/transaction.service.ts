import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { generateUserTransCode } from '../../utils/index'; // Adjust the import path as necessary

@Injectable()
export class TransactionService {
    constructor(private readonly db: DatabaseService) { }

    async getAllTransactions(paginationDto: { limit?: number; page?: number }) {
        const { limit = 10, page = 1 } = paginationDto;
        const skip = (page - 1) * limit;

        const [transactions, total] = await Promise.all([
            this.db.transaction.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    buyer: true,
                    seller: true,
                    dispute: true,
                    payment: true,
                },
            }),
            this.db.transaction.count(),
        ]);

        return {
            data: transactions,
            total,
            page,
            lastPage: Math.ceil(total / limit),
        };
    }


    // CREATE TRANSACTION
    async createTransaction(data: CreateTransactionDto) {
        const transCode = generateUserTransCode();
        try {
            const newTransaction = await this.db.transaction.create({
                data: {
                    ...data,
                    transCode,
                },
            });
            return newTransaction;
        } catch (error) {
            // Optional: handle known Prisma errors specifically
            if (error.code === 'P2002') {
                throw new BadRequestException('Transaction with this code already exists.');
            }
            throw new InternalServerErrorException('Failed to create transaction.');
        }
    }

}
