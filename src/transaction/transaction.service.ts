import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { generateUserTransCode, releaseRef } from '../../utils/index'; // Adjust the import path as necessary
import { sendSMS } from '../../utils/sms';
import { PaymentStatus, TransactionStatus } from '@prisma/client';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class TransactionService {
  constructor(private readonly db: DatabaseService, private readonly cloudinaryService: CloudinaryService) { }

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

    return {
      data: transactions, // array of transactions
      total, //total number of records
      page, // current page number
      lastPage: Math.ceil(total / limit), // last page number
    };
  }

  // CREATE TRANSACTION
  async createTransaction(data: any, file: Express.Multer.File) {
    const transCode = generateUserTransCode();

    try {
      let parsedData = data;
      if (typeof data.payload === 'string') {
        parsedData = JSON.parse(data.payload);
      }
      const newTransaction = await this.db.transaction.create({
        data: {
          ...parsedData,
          transCode,
          itemImage: file ? await this.cloudinaryService.uploadImage(file) : null,
        },
      });

      return { message: "Transaction created successfully", id: newTransaction.id };
    } catch (error) {
      // Optional: handle known Prisma errors specifically
      if (error.code === 'P2002') {
        throw new BadRequestException('Transaction with this code already exists.');
      }

      console.log(error.message)
      throw new InternalServerErrorException('Failed to create transaction.', error.message);
    }
  }

  // get transaction status
  async getTransactionStatus(id: string) {
    try {
      const transaction = await this.db.transaction.findUnique({ where: { id } });
      return transaction?.status;
    } catch (error) {
      throw new InternalServerErrorException('Failed to get transaction status.', error);
    }
  }


  // update transaction info
  async updateTransactionInfo(id: string, data: any) {
    try {
      await this.db.transaction.update({
        where: { id },
        data,
      });
      return { message: "Transaction updated successfully" };
    } catch (error) {
      throw new InternalServerErrorException('Failed to update transaction info.', error);
    }
  }


  // DELETE TRANSACTION
  async deleteTransaction(id: string) {
    try {
      const deletedTransaction = await this.db.transaction.delete({
        where: { id },
      });
      return { message: "Transaction deleted successfully" };
    } catch (error) {
      throw new InternalServerErrorException('Failed to delete transaction.', error);
    }
  }

  // GET TRANSACTION BY ID
  async getTransactionById(id: string) {
    try {
      // add buyer and seller info
      const transaction = await this.db.transaction.findUnique({
        where: { id },
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

        }
      });
      return transaction;
    } catch (error) {
      throw new InternalServerErrorException('Failed to get transaction.', error);
    }
  }

  // GET TRANSACTION BY 
  async getTransactionByCode(code: string) {
    try {
      const transaction = await this.db.transaction.findUnique({ where: { transCode: code } });
      return transaction;
    } catch (error) {
      throw new InternalServerErrorException('Failed to get transaction.', error);
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
      throw new InternalServerErrorException('Failed to update transaction status.', error);
    }
  }

  // FILTER TRANSACTIONS WITH PAGINATION
  async filterTransactions(filter: any, pagination: { page: number; limit: number }) {
    try {
      const page = pagination?.page > 0 ? pagination.page : 1;
      const limit = pagination?.limit > 0 ? pagination.limit : 10;
      const skip = (page - 1) * limit;

      const where = filter || {};

      const [transactions, total] = await Promise.all([
        this.db.transaction.findMany({
          where,
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
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.db.transaction.count({ where }),
      ]);

      return {
        data: transactions,
        total,
        page,
        lastPage: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('[Filter Transactions Error]', error);
      throw new InternalServerErrorException('Failed to filter transactions.');
    }
  }

  // service to release funds to seller number and check status as COMPLETED
  async releaseFunds(transactionId: string, buyerId: string) {
    const transaction = await this.db.transaction.findUnique({
      where: { id: transactionId },
      include: { payment: true },
    });

    if (!transaction || transaction.buyerId !== buyerId) {
      throw new BadRequestException('Transaction not found or unauthorized.');
    }

    if (transaction.status !== 'IN_ESCROW') {
      throw new BadRequestException('Funds cannot be released at this stage.');
    }

    // Create settlement record
    await this.db.settlement.create({
      data: {
        transactionId,
        amount: transaction?.amount,
        releasedTo: transaction?.sellerId! || transaction?.sellerMomoNumber!,
        type: 'RELEASE_TO_SELLER',
      },
    });

    await this.db.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'COMPLETED',
        releaseDate: new Date(),
      },
    });

    // SEND RELEASE FUNDS SMS TO SELLER MOMONUMBER using our sms function
    return { message: 'Funds released to seller.' };
  }

  // Update payment status and create payment record
  async updateIsPaid(transactionId: string, body: { reference: string; status: string }) {
    try {
      const transaction = await this.db.transaction.findUnique({ 
        where: { id: transactionId },
        include: { buyer: true }
      });
      
      if (!transaction) {
        throw new NotFoundException('Transaction not found.');
      }

      if (!transaction.buyerId) {
        throw new BadRequestException('Transaction must have a buyer to process payment.');
      }

      await this.db.transaction.update({
        where: { id: transactionId },
        data: { isFunded: true, status: 'IN_ESCROW' },
      });

      await this.db.payment.create({
        data: {
          transactionId,
          userId: transaction.buyerId,
          amount: transaction.amount,
          paymentMethod: 'MOMO',
          reference: body.reference,
          status: body.status as any, // Cast to any to satisfy TypeScript
        },
      });

      // Send SMS to seller if sellerMomoNumber exists
      if (transaction.sellerMomoNumber) {
        const smsMsg = `Hello! A buyer has initiated an escrow transaction for ${transaction.title}, with transaction code ${transaction.transCode} has been initiated by ${transaction.buyer?.name || 'a buyer'} worth GHS ${transaction.amount}. Please visit https://escrowgh.com/approve/${transaction.transCode} to approve or view details`;
        sendSMS(transaction.sellerMomoNumber, smsMsg);
      }

      return { status: 'success', message: 'Transaction paid successfully' };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update transaction.', error);
    }
  }

  // GET RECENT TRANSACTIONS of user add buyer and seller info
  async getRecentTransactions(userId: string) {
    try {
      const transactions = await this.db.transaction.findMany({
        where: { buyerId: userId },
        take: 5,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          buyer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              userCode: true,
            },
          },
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              userCode: true,
            },
          },
        },
      });
      return transactions;
    } catch (error) {
      throw new InternalServerErrorException('Failed to get recent transactions.', error);
    }
  }

  async getUserTransactions(userId: string) {
    try {
      const transactions = await this.db.transaction.findMany({
        where: { buyerId: userId },
        include: {
          buyer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              userCode: true,
            },
          },
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              userCode: true,
            },
          },
        },
      });
      return transactions;
    } catch (error) {
      throw new InternalServerErrorException('Failed to get users transactions.', error);
    }
  }

}

// get users transactions


