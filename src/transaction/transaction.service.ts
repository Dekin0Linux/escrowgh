import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { generateUserTransCode } from '../../utils/index'; // Adjust the import path as necessary
import { sendSMS } from '../../utils/sms';

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
                    buyer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            userCode: true,
                            isAdmin: true,
                        },
                    },
                    seller: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            userCode: true,
                            isAdmin: true,
                        },
                    },
                    dispute: true,
                    payment: true,
                },
            }),
            this.db.transaction.count(),
        ]);

        // send sms to the seller phone number
        

        return {
            data: transactions, // array of transactions
            total, //total number of records
            page, // current page number
            lastPage: Math.ceil(total / limit), // last page number
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

            const buyer = await this.db.user.findUnique({ where: { id: newTransaction?.buyerId! } });

            const smsMsg = `Hello! A buyer has initiated an escrow transaction for ${newTransaction?.title}, with transaction code ${newTransaction?.transCode} has been initiated by ${buyer?.name!} worth GHS ${newTransaction?.amount!}. Please visit https://escrowgh.com/approve/${newTransaction?.transCode} to approve or view details`;
            sendSMS(newTransaction?.sellerMomoNumber!, smsMsg);

            return {message:"Transaction created successfully"};
        } catch (error) {
            // Optional: handle known Prisma errors specifically
            if (error.code === 'P2002') {
                throw new BadRequestException('Transaction with this code already exists.');
            }
            throw new InternalServerErrorException('Failed to create transaction.');
        }
    }


    // update transaction info
    async updateTransactionInfo(id: string, data: CreateTransactionDto) {
        try {
            await this.db.transaction.update({
                where: { id },
                data,
            });
            return {message:"Transaction updated successfully"};
        } catch (error) {
            throw new InternalServerErrorException('Failed to update transaction info.',error);
        }
    }


    // DELETE TRANSACTION
    async deleteTransaction(id: string) {
        try {
            const deletedTransaction = await this.db.transaction.delete({
                where: { id },
            });
            return {message:"Transaction deleted successfully"};
        } catch (error) {
            throw new InternalServerErrorException('Failed to delete transaction.',error);
        }
    }

    // GET TRANSACTION BY ID
    async getTransactionById(id: string) {
        try {
            const transaction = await this.db.transaction.findUnique({ where: { id } });
            return transaction;
        } catch (error) {
            throw new InternalServerErrorException('Failed to get transaction.',error);
        }
    }

    // GET TRANSACTION BY 
    async getTransactionByCode(code: string) {
        try {
            const transaction = await this.db.transaction.findUnique({ where: { transCode: code } });
            return transaction;
        } catch (error) {
            throw new InternalServerErrorException('Failed to get transaction.',error);
        }
    }

    // update transaction status
    async updateTransactionStatus(id: string, status: any) {
        try {
            const updatedTransaction = await this.db.transaction.update({
                where: { id },
                data: { status },
            });
            return updatedTransaction;
        } catch (error) {
            throw new InternalServerErrorException('Failed to update transaction status.',error);
        }
    }

    



    



}
