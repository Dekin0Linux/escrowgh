import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DisputeStatus } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class DisputeService {
    constructor(private readonly db: DatabaseService) { }

    // get all disputes
    async getAllDisputes() {
        try {
            const disputes = await this.db.dispute.findMany();
            return disputes;
        } catch (error) {
            throw new InternalServerErrorException('Failed to get disputes.',error);
        }
    }


    // create dispute
    /*
    @param transactionId: string
    @param userId: string
    @param reason: string
    */
    async createDispute(transactionId: string, userId: string, reason: string) {
        try {
            const transaction = await this.db.transaction.findUnique({
                where: { id: transactionId },
            });

            if (!transaction || (transaction.buyerId !== userId && transaction.sellerId !== userId)) {
                throw new BadRequestException('Unauthorized to raise dispute.');
            }

            await this.db.transaction.update({
                where: { id: transactionId },
                data: { status: 'DISPUTED' },
            });

            await this.db.dispute.create({
                data: {
                    transactionId,
                    userId,
                    reason,
                },
            });

            return {message:"Dispute created successfully"};

        } catch (error) {
            // Optional: handle known Prisma errors specifically
            if (error.code === 'P2002') {
                throw new BadRequestException('Transaction with this code already exists.');
            }
            throw new InternalServerErrorException('Failed to create dispute.',error);

        }

    }

    // settle dispute
    /*
    @param transactionId: string
    @param settleToBuyer: boolean
    */
    async settleDispute(transactionId: string, settleToBuyer: boolean) {
        try {
            const transaction = await this.db.transaction.findUnique({
                where: { id: transactionId },
                include: { payment: true },
            });
    
            if (!transaction || transaction.status !== 'DISPUTED') {
                throw new BadRequestException('Transaction not eligible for settlement.');
            }
    
            const recipientId = settleToBuyer ? transaction.buyerId : transaction.sellerId;
    
            await this.db.settlement.create({
                data: {
                    transactionId,
                    amount: transaction.amount,
                    releasedTo: recipientId ? recipientId : "UNREGISTERED USER",
                    type: settleToBuyer ? 'REFUND_TO_BUYER' : 'RELEASE_TO_SELLER',
                    userId: recipientId ? recipientId : "UNREGISTERED USER",
                },
            });
    
            await this.db.transaction.update({
                where: { id: transactionId },
                data: {
                    status: 'COMPLETED',
                    releaseDate: new Date(),
                },
            });
    
            await this.db.dispute.updateMany({
                where: { transactionId },
                data: {
                    status: 'RESOLVED',
                    resolvedAt: new Date(),
                    resolution: `Funds ${settleToBuyer ? 'refunded to buyer' : 'released to seller'}`,
                },
            });
    
            return { message: 'Dispute settled successfully.' };
        }catch (error) {
            throw new InternalServerErrorException('Failed to settle dispute.',error);      
        }
    }

    // get dispute by status
    /*
    @param status: string 
    */
    async getDisputesByStatus(status?: string) {
        try {
          let whereClause = {};
    
          if (status) {
            const validStatuses = Object.values(DisputeStatus);
            if (!validStatuses.includes(status as DisputeStatus)) {
              throw new BadRequestException(`Invalid status. Valid values: ${validStatuses.join(', ')}`);
            }
            whereClause = { status: status as DisputeStatus };
          }
    
          const disputes = await this.db.dispute.findMany({
            where: whereClause,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
              transaction: true,
            },
            orderBy: { createdAt: 'desc' },
          });
    
          return disputes;
        } catch (error) {
          throw new InternalServerErrorException('Failed to fetch disputes,Invalid status provided',error);
        }
    }

    // get dispute by transaction id
    /*
    @param transactionId: string 
    */
    async getDisputesByTransactionId(transactionId: string) {
        try {
          const disputes = await this.db.dispute.findMany({
            where: { transactionId },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
              transaction: true,
            },
            orderBy: { createdAt: 'desc' },
          });
    
          return disputes;
        } catch (error) {
          throw new InternalServerErrorException('Failed to fetch disputes by transaction id',error);
        }
    }

    // get dispute by user id
    /*
    @param userId: string 
    */
    async getDisputesByUserId(userId: string) {
        try {
          const disputes = await this.db.dispute.findMany({
            where: { userId },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
              transaction: true,
            },
            orderBy: { createdAt: 'desc' },
          });
    
          return disputes;
        } catch (error) {
          throw new InternalServerErrorException('Failed to fetch disputes by user id',error);
        }
    }

    // get the count of each dispute status
    /*
    @param userId: string 
    */
    async getDisputesStatusCountByUserId(userId: string) {
        try {
          const [resolved, inProgress, open, rejected] = await Promise.all([
            this.db.dispute.count({ where: { userId, status: 'RESOLVED' } }),
            this.db.dispute.count({ where: { userId, status: 'INPROGRESS' } }),
            this.db.dispute.count({ where: { userId, status: 'OPEN' } }),
            this.db.dispute.count({ where: { userId, status: 'REJECTED' } }),
          ]);
    
          return {resolved, inProgress, open, rejected};
        } catch (error) {
          throw new InternalServerErrorException('Failed to get disputes status count by user id',error);
        }
    }

   



    
}
