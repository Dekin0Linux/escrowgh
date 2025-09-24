import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { generateUserTransCode, releaseRef } from '../../utils/index'; // Adjust the import path as necessary
import { sendSMS } from '../../utils/sms';
import { PaymentStatus, TransactionStatus } from '@prisma/client';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class TransactionService {
  constructor(private readonly db: DatabaseService, private readonly cloudinaryService: CloudinaryService) { }

  // Get transaction statistics including total, in escrow, completed, and disputed transactions
  async getTransactionStats() {
    try {
      // Get all transactions with necessary fields
      const transactions = await this.db.transaction.findMany({
        select: {
          amount: true,
          status: true,
        },
      });

      // Calculate statistics
      const totalTransactions = transactions.length;
      const totalValue = transactions.reduce((sum, t) => sum + t.amount, 0);
      const inEscrowCount = transactions.filter(t => t.status === 'IN_ESCROW').length;
      const completedCount = transactions.filter(t => t.status === 'COMPLETED').length;
      const disputedCount = transactions.filter(t => t.status === 'DISPUTED').length;

      return {
        totalTransactions,
        totalValue: parseFloat(totalValue.toFixed(2)),
        inEscrow: inEscrowCount,
        completed: completedCount,
        disputed: disputedCount,
      };
    } catch (error) {
      console.error('[Get Transaction Stats Error]', error);
      throw new InternalServerErrorException('Failed to get transaction statistics.');
    }
  }

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
      if (typeof data.payload === 'string') { parsedData = JSON.parse(data.payload); }

      const initiatorRole = parsedData.initiateBy

      // find initiator user
      const initiatorUser = await this.db.user.findUnique({ where: { id: parsedData.initiatorId } });
      if (!initiatorUser) throw new BadRequestException('Initiator user not found');


      // find counterparty by code or phone if provided
      let counterpartyUser: any = null;
      if (parsedData.counterpartyCode) {
        counterpartyUser = await this.db.user.findUnique({ where: { userCode: parsedData.counterpartyCode } });
      } else if (parsedData.counterpartyPhone) {
        counterpartyUser = await this.db.user.findUnique({ where: { phone: parsedData.counterpartyPhone } });
      }


      // map buyer/seller ids based on initiatorRole
      const buyerId = initiatorRole === 'Buyer' ? initiatorUser.id : counterpartyUser?.id;
      const sellerId = initiatorRole === 'Seller' ? initiatorUser.id : counterpartyUser?.id;

       // initiator cannot be same as seller
      if(buyerId  ==  sellerId) {
        throw new BadRequestException('Invalid counterparty');
      }

      // IMAGE UPLOAD
      const itemImage = file ? await this.cloudinaryService.uploadImage(file) : null;

      const newTx = await this.db.transaction.create({
        data: {
          transCode,
          title: parsedData.title,
          amount: parsedData.amount,
          currency: parsedData.currency ?? 'GHS',
          initiateBy: initiatorRole,
          buyerId,
          currentRole : initiatorRole,
          sellerId,
          sellerMomoNumber: parsedData.sellerMomoNumber,
          description: parsedData.description,
          itemImage,
          counterpartyPhone: counterpartyUser ? counterpartyUser.phone : parsedData.counterpartyPhone,
          initiatorAccepted: true,
          counterpartyAccepted: false,
          status: 'PENDING',
          commissionFee : parsedData.commissionFee
        },
      });

      // notify counterparty if exists
      if (counterpartyUser?.phone) {
        // SEND SMS TO COUNTERPART PARTIES
        // await this.notificationService.sendSMS(
        //   counterpartyUser.phone,
        //   `You have a new escrow transaction (${newTx.transCode}). Please log in to accept.`
        // );
      }

      // RETURN TRANSACTION 
      return { message: "Transaction created successfully", id: newTx.id };
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
  

  // ACCEPT TRANSACTION
  async acceptTransaction(userId: string, transactionId: string) {
    const tx = await this.db.transaction.findUnique({ where: { id: transactionId } });
    if (!tx) throw new NotFoundException('Transaction not found');

    if(tx.counterpartyAccepted) {
      throw new ForbiddenException('Counterpart accepted already');
    }


    // check that user is counterparty
    if (tx.initiateBy === 'BUYER' && tx.sellerId !== userId) {
      throw new ForbiddenException('You are not the counterparty');
    }
    if (tx.initiateBy === 'SELLER' && tx.buyerId !== userId) {
      throw new ForbiddenException('You are not the counterparty');
    }

    const updated = await this.db.transaction.update({
      where: { id: transactionId },
      data: {
        counterpartyAccepted: true,
        status: 'ACCEPTED'
      }
    });

    // SEND ACCEPTANCE SMS

    return { message: 'Transaction accepted', id: updated.id };
  }

  // Step 1: Initiator creates transaction. Status = PENDING, initiatorAccepted = true, counterpartyAccepted = false.

  // Step 2: Counterparty logs in and “accepts.” Status = ACCEPTED.

  // Step 3: Buyer pays. Status = FUNDED, isFunded = true.

  // Step 4: Seller delivers, buyer releases. Status = COMPLETED.



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

      // if conterpart is false reject 
      if (!transaction.counterpartyAccepted) {
        throw new BadRequestException('Your counterpart has not accepted this transaction yet.');
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
        where: { OR : [
          {buyerId :userId},
          {sellerId : userId}
        ] },
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

  // Get user statistics including transaction counts and amounts
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
      const pendingPayments = transactions.filter(t => t.status === 'PENDING').length;
      const totalValue =  transactions.filter(t => t.status === 'COMPLETED')

      const openDisputesCount = await this.db.dispute.count({
        where: { userId, status: 'OPEN' }
      });

      const inProgressDisputesCount = await this.db.dispute.count({
        where: { userId, status: 'INPROGRESS' }
      });

      const disputesCount = openDisputesCount + inProgressDisputesCount;
      const totalAmount = totalValue.reduce((acc, t) => acc + t.amount, 0);

      const successRate = totalTransactions > 0
        ? ((totalTransactions - disputesCount) / totalTransactions) * 100
        : 0;

      return {
        totalTransactions,
        pendingPayments,
        disputesCount,
        totalAmount,
        successRate: parseFloat(successRate.toFixed(2))
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get user statistics.', error);
    }
  }

  // Get all transactions for a specific user
  async getUserTransactions(userId: string) {
    try {
      const transactions = await this.db.transaction.findMany({
        where: { OR : [
          {buyerId :userId},
          {sellerId : userId}
        ] },
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
      throw new InternalServerErrorException('Failed to get users transactions.', error);
    }
  }

}




