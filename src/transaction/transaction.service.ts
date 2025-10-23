import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { generateUserTransCode, releaseRef } from '../../utils/index'; // Adjust the import path as necessary
import { sendSMS } from '../../utils/sms';
import { PaymentStatus, TransactionStatus } from '@prisma/client';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class TransactionService {
  constructor(private readonly db: DatabaseService, private readonly cloudinaryService: CloudinaryService, private readonly notificationService: NotificationService) { }

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

  async getAllTransactions(paginationDto: { limit?: number; page?: number, search?: string | undefined }) {
    const { limit = 10, page = 1, search = undefined } = paginationDto;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.db.transaction.findMany({
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        where: {
          OR: [
            { title: { contains: search } },
            { description: { contains: search } },
            { buyer: { name: { contains: search } } },
            { seller: { name: { contains: search } } },
            ...(Object.values(TransactionStatus).includes(search as TransactionStatus)
              ? [{ status: { equals: search as TransactionStatus } }]
              : []),
          ],
        },
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
    const transCode = generateUserTransCode(); //generate trnasaction code

    try {
      let parsedData = data; //parse form data due to image 
      if (typeof data.payload === 'string') { parsedData = JSON.parse(data.payload); }

      const initiatorRole = parsedData.initiateBy // get the initiator role

      // find initiator user
      const initiatorUser = await this.db.user.findUnique({ where: { id: parsedData.initiatorId } });
      if (!initiatorUser) throw new BadRequestException('Initiator user not found');

      // find counterPartyUser
      let counterPartyUser: any = null;
      if (parsedData.counterpartyCode) {
        counterPartyUser = await this.db.user.findUnique({ where: { userCode: parsedData.counterpartyCode } });
      } else if (parsedData.counterpartyPhone) {
        counterPartyUser = await this.db.user.findUnique({ where: { phone: parsedData.counterpartyPhone } });
      }else {
        throw new BadRequestException('Counterparty not found');
      }

      // find counterparty by code or phone if provided
      let counterpartyUser: any = null;
      if (parsedData.counterpartyCode) {
        counterpartyUser = await this.db.user.findUnique({ where: { userCode: parsedData.counterpartyCode } });
      } else if (parsedData.counterpartyPhone) {
        counterpartyUser = await this.db.user.findUnique({ where: { phone: parsedData.counterpartyPhone } });
      }else {
        throw new BadRequestException('Counterparty not found');
      }

      // if counter id not exist throw error
      if (!counterpartyUser) throw new BadRequestException('Counterparty not found');

      // if initiator id not exist throw error
      if (!initiatorUser) throw new BadRequestException('Initiator user not found');

      // if initiator id is same as counterparty id throw error
      if (initiatorUser?.id === counterpartyUser?.id) throw new BadRequestException('Initiator and counterparty cannot be the same');


      // map buyer/seller ids based on initiatorRole
      const buyerId = initiatorRole === 'Buyer' ? initiatorUser?.id : counterpartyUser?.id;
      const sellerId = initiatorRole === 'Seller' ? initiatorUser?.id : counterpartyUser?.id;

      // // initiator cannot be same as seller
      // if (buyerId == sellerId) {
      //   throw new BadRequestException('Invalid counterparty');
      // }

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
          currentRole: initiatorRole,
          sellerId,
          sellerMomoNumber: parsedData.sellerMomoNumber,
          description: parsedData.description,
          itemImage,
          counterpartyPhone: counterpartyUser ? counterpartyUser.phone : parsedData.counterpartyPhone,
          initiatorAccepted: true,
          counterpartyAccepted: false,
          status: 'PENDING',
          commissionFee: parsedData.commissionFee
        },
      });

      // send sms to counterparty
      if (counterpartyUser.phone) {
        sendSMS(counterpartyUser.phone, `You have a new escrow transaction from ${initiatorUser.name} with an amount of ${parsedData.amount}. Please log in to accept.`);
      }

      // notify counterparty using the notification service
      if (counterpartyUser.expoToken) {
        await this.notificationService.sendPushNotification(
          counterpartyUser.expoToken,
          `New MiBuyer Transaction`,
          `You have a new escrow transaction from ${initiatorUser.name} with an amount of ${parsedData.amount}. Please log in to accept.`
        );
      }

      // RETURN TRANSACTION 
      return { message: "Transaction created successfully", id: newTx.id };
    } catch (error) {
      // Optional: handle known Prisma errors specifically
      if (error.code === 'P2002') {
        throw new BadRequestException('Transaction with this code already exists.');
      }
      if(error.status === 400){
        throw new BadRequestException(error);
      }

      console.log(error.status)
      throw new InternalServerErrorException('Failed to create transaction.', error);
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

    if (tx.counterpartyAccepted) {
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

  // REJECT TRANSACTION
  async rejectTransaction(userId: string, transactionId: string) {
    const tx = await this.db.transaction.findUnique({ where: { id: transactionId } });
    if (!tx) throw new NotFoundException('Transaction not found');

    if (tx.counterpartyAccepted) {
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
        counterpartyAccepted: false,
        status: 'CANCELED'
      }
    });

    // SEND ACCEPTANCE SMS
    return { message: 'Transaction rejected', id: updated.id };
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
      if(error.status === 400){
        throw new BadRequestException(error);
      }
      throw new InternalServerErrorException(error);
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
    try {
      
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
    
        // get seller expoToken from the transaction sellerId
        const seller = await this.db.transaction.findUnique({
          where: { id: transactionId },
          include: { seller: true },
        });
    
        // SEND MONEY TO THE SELLER MOMONUMBER
        if (seller?.seller?.phone) {
    
          // SEND MONEY TO SELLER
          
          sendSMS(
            seller.seller.phone,
            `An amount of GHS ${transaction.amount} has been released to your account. For the payment of ${transaction.title}, Transaction is now COMPLETED`
          );
        }
    
        // notify counterparty using the notification service
        if (seller?.seller?.expoToken) {
          await this.notificationService.sendPushNotification(
            seller.seller.expoToken,
            `Funds Release`,
            `An amount of GHS ${transaction.amount} has been released to your account. For the payment of ${transaction.title}, Transaction is now COMPLETED`
          );
        }
    
        // SEND RELEASE FUNDS SMS TO SELLER MOMONUMBER using our sms function
        return { message: 'Funds released to seller.' };
    } catch (error) {

      if(error.status === 400){
        throw new BadRequestException(error);
      }
      throw new InternalServerErrorException('Failed to release funds.', error);
    }
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

      // send sms to buyer
      if (transaction.buyer?.phone) {
        const smsMsg = `Your payment for ${transaction.title}, with transaction code ${transaction.transCode} has been received. Please visit https://escrowgh.com/approve/${transaction.transCode} to view details`;
        sendSMS(transaction.buyer?.phone, smsMsg);
      }

      return { status: 'success', message: 'Transaction paid successfully' };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      if(error.status === 400){
        throw new BadRequestException(error);
      }

      
      throw new InternalServerErrorException('Failed to update transaction.', error);
    }
  }


  // GET RECENT TRANSACTIONS of user add buyer and seller info
  async getRecentTransactions(userId: string) {
    try {
      const transactions = await this.db.transaction.findMany({
        where: {
          OR: [
            { buyerId: userId },
            { sellerId: userId }
          ]
        },
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
      const totalValue = transactions.filter(t => t.status === 'COMPLETED')

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
        where: {
          OR: [
            { buyerId: userId },
            { sellerId: userId }
          ]
        },
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

  // Get monthly transactions
  async getMonthlyTransactions() {
    try {
      const transactions = await this.db.transaction.findMany({
        select: {
          id: true,
          amount: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const monthlyTransactions = transactions.reduce((acc: any, t: any) => {
        const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(t.createdAt));
        const today = new Date();
        const firstDayOfMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        if (new Date(t.createdAt) >= firstDayOfMonthAgo) {
          const existingMonth = acc.find((m: any) => m.month === month);
          if (existingMonth) {
            existingMonth.transactions += 1;
            existingMonth.revenue += t.amount;
          } else {
            acc.push({ month, transactions: 1, revenue: t.amount });
          }
        }
        return acc;
      }, []);

      // Get previous 12 months
      const previousMonths = Array.from({ length: 12 }, (v, k) => new Date(Date.now() - k * 1000 * 60 * 60 * 24 * 30 * 1000)).map(d => new Intl.DateTimeFormat('en-US', { month: 'short' }).format(d));

      // Add previous months with 0 transactions and revenue
      previousMonths.forEach(m => {
        const existingMonth = monthlyTransactions.find(mt => mt.month === m);
        if (!existingMonth) {
          monthlyTransactions.push({ month: m, transactions: 0, revenue: 0 });
        }
      });

      // Sort by month
      monthlyTransactions.sort((a, b) => previousMonths.indexOf(a.month) - previousMonths.indexOf(b.month));

      return monthlyTransactions;
    } catch (error) {
      throw new InternalServerErrorException('Failed to get monthly transactions.', error);
    }
  }

  // Get an array of months and the respective transaction volume or count
  async getMonthlyTransactionsCounts() {
    try {
      const transactions = await this.db.transaction.findMany({
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const monthlyTransactionsCounts = transactions.reduce((acc: any, t: any) => {
        const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(t.createdAt));
        const existingMonth = acc.find((m: any) => m.month === month);
        if (existingMonth) {
          existingMonth.count += 1;
          existingMonth.volume += t.amount;
        } else {
          acc.push({ month, count: 1, volume: t.amount });
        }
        return acc;
      }, []);

      // Get previous 12 months
      const previousMonths = Array.from({ length: 12 }, (v, k) => new Date(Date.now() - k * 1000 * 60 * 60 * 24 * 30 * 1000)).map(d => new Intl.DateTimeFormat('en-US', { month: 'short' }).format(d));

      // Add previous months with 0 transactions and revenue
      previousMonths.forEach(m => {
        const existingMonth = monthlyTransactionsCounts.find(mt => mt.month === m);
        if (!existingMonth) {
          monthlyTransactionsCounts.push({ month: m, count: 0, volume: 0 });
        }
      });

      // Sort by month
      monthlyTransactionsCounts.sort((a, b) => previousMonths.indexOf(a.month) - previousMonths.indexOf(b.month));

      return monthlyTransactionsCounts;
    } catch (error) {
      throw new InternalServerErrorException('Failed to get monthly transactions counts.', error);
    }
  }

  // GET ANALYTICS
  // TOTAL USERS, TOTAL TRANSACTIONS, ACTIVE DISPUTES, TOTAL REVENUE
  async getAnalytics() {
    try {
      const totalUsers = await this.db.user.count();
      const totalTransactions = await this.db.transaction.count();
      const activeDisputes = await this.db.dispute.count({ where: { status: 'OPEN' } });
      const totalComission = await this.db.transaction.aggregate({ _sum: { commissionFee: true } });
      return {
        totalUsers,
        totalTransactions,
        activeDisputes,
        totalComission: totalComission._sum.commissionFee,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get analytics.', error);
    }
  }


}




