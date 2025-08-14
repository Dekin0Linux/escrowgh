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

  // get user statistics
  async getUserStatistics(userId: string) {
    try {

      const user = await this.db.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found.');
      }
      const transactions = await this.db.transaction.findMany({
        where: { buyerId: userId },
      });
      const totalTransactions = transactions.length;
      const pendingPayments = transactions.filter((t) => t.status === 'PENDING').length;
      // const disputesCount = transactions.filter((t: any) => t.dispute).length;
      const openDisputesCount = await this.db.dispute.count({ where: { userId, status: 'OPEN' } });
      const inProgressDisputesCount = await this.db.dispute.count({ where: { userId, status: 'INPROGRESS' } });
      const disputesCount = openDisputesCount + inProgressDisputesCount;

      const totalAmount = transactions.reduce((acc, t) => acc + t.amount, 0);
      const successRate = totalTransactions > 0 ? (totalTransactions - disputesCount) / totalTransactions : 0;
      return { totalTransactions, pendingPayments, disputesCount, totalAmount, successRate: successRate?.toFixed(2) };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get user statistics.', error);
    }
  }


  // update isPaid field and create payment record
  async updateIsPaid(transactionId: string, body: any) {
    try {
      const transaction = await this.db.transaction.findUnique({ where: { id: transactionId } });
      if (!transaction) {
        throw new NotFoundException('Transaction not found.');
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
          status: body.status,
        },
      });
      // get buyer
      const buyer = await this.db.user.findUnique({ where: { id: transaction?.buyerId! } });

      // send sms to seller
      const smsMsg = `Hello! A buyer has initiated an escrow transaction for ${transaction?.title}, with transaction code ${transaction?.transCode} has been initiated by ${buyer?.name!} worth GHS ${transaction?.amount!}. Please visit https://escrowgh.com/approve/${transaction?.transCode} to approve or view details`;
      sendSMS(transaction?.sellerMomoNumber!, smsMsg);

      return { status: 'success', message: 'Transaction paid successfully' };
    } catch (error) {
      throw new InternalServerErrorException('Failed to update transaction.', error);
    }
  }

  // GET RECENCENT TRANSACRTIONS of user add buyer and seller info
  async getRecentTransactions(userId: string) {
    try {
      const transactions = await this.db.transaction.findMany({
        where: { buyerId: userId },
        take: 10,
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


