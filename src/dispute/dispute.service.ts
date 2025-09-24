import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DisputeStatus } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import * as multer from 'multer';
import { generateUserTransCode, releaseRef } from '../../utils/index'; // Adjust the import path as necessary
import { sendSMS } from 'utils/sms';


@Injectable()
export class DisputeService {
  constructor(
    private readonly db: DatabaseService,
    private readonly cloudinaryService: CloudinaryService) { }

  // get all disputes
  async getAllDisputes() {
    try {
      const disputes = await this.db.dispute.findMany({
        include: {
          user: true,
          transaction: true,
          buyer : {select : {id:true,name:true,email:true,phone:true,expoToken:true}},
          seller : {select: {id:true,name:true,email:true,phone:true,expoToken:true}}
        
        },
        orderBy: { createdAt: 'desc' },
      });
      return disputes;
    } catch (error) {
      throw new InternalServerErrorException('Failed to get disputes.', error);
    }
  }


  // create dispute
  /*
  @param transactionId: string
  @param userId: string
  @param reason: string
  @param file: File
  */
  async createDispute(userId: string, payload: any, file: Express.Multer.File) {
    try {
      const transaction = await this.db.transaction.findUnique({
        where: { id: payload.transactionId },
      });

      if (!transaction || (transaction.buyerId !== userId && transaction.sellerId !== userId)) {
        throw new BadRequestException('Unauthorized to raise dispute.');
      }

      // UPDATING TRANSACTION STATUS
      const tx = await this.db.transaction.update({
        where: { id: payload.transactionId },
        data: { status: 'DISPUTED' },
      });

      const imageUrl = file ? await this.cloudinaryService.uploadImage(file) : null;

      // CREATING DISPUTE
      await this.db.dispute.create({
        data: {
          transactionId: payload.transactionId,
          userId,
          reason: payload.reason,
          evidence: imageUrl,
          status: 'OPEN',
          description: payload.description,
          info: payload.info,
          disputeNo: generateUserTransCode(),
          //@ts-ignore
          buyerId : tx?.buyerId,
          sellerId : tx?.sellerId
        },
      });

      // send sms to seller and buyer

      return { message: "Dispute created successfully" };

    } catch (error) {
      // Optional: handle known Prisma errors specifically
      if (error.code === 'P2002') {
        throw new BadRequestException('Transaction with this code already exists.');
      }
      throw new InternalServerErrorException('Failed to create dispute.', error);

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


      if (!transaction || transaction.status !== 'DISPUTED' || transaction.isFunded != true) {
        throw new BadRequestException('Transaction not eligible for settlement.');
      }

      // get the recipient id 
      const recipientId = settleToBuyer ? transaction.buyerId : transaction?.sellerId || null;

      // create a settlement record
      await this.db.settlement.create({
        data: {
          transactionId,
          amount: transaction.amount,
          releasedTo: recipientId ? recipientId : "UNREGISTERED USER",
          type: settleToBuyer ? 'REFUND_TO_BUYER' : 'RELEASE_TO_SELLER',
          userId: recipientId ? recipientId : null,
        },
      });

      // update the transaction status to completed
      await this.db.transaction.update({
        where: { id: transactionId,isFunded: true },
        data: {
          status: 'COMPLETED',
          releaseDate: new Date(),
        },
      });

      
      // update the dispute status to resolved
      await this.db.dispute.updateMany({
        where: { transactionId },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          resolution: `Funds ${settleToBuyer ? 'refunded to buyer' : 'released to seller' }`,
        },
      });

      // send money to buyer or seller
      if (settleToBuyer) {
        // send money to buyer
        // send SMS to buyer
        const buyer = await this.db.user.findUnique({ where: { id : transaction?.buyerId || 'undefined'} });
        if (buyer?.phone) {
          sendSMS(buyer.phone, `An amount of ${transaction.amount} has been settled to you for ${transaction.title} with transaction code ${transaction.transCode} `);
        }
      } else {
        // send money to seller
        // send SMS to seller
        const seller = transaction?.sellerMomoNumber;
        if (seller) {
          sendSMS(seller, `You have a new transaction ${transaction.transCode}`);
        }
      }

      return { message: 'Dispute settled successfully.' };
    } catch (error) {
      console.log(error)
      throw new InternalServerErrorException(error.message);
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
      throw new InternalServerErrorException('Failed to fetch disputes,Invalid status provided', error);
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
      throw new InternalServerErrorException('Failed to fetch disputes by transaction id', error);
    }
  }

  // get dispute by user id
  /*
  @param userId: string 
  */
  async getDisputesByUserId(userId: string) {
    try {
      const disputes = await this.db.dispute.findMany({
        // or buyer
        where: { OR : [{buyerId :userId},{sellerId : userId}] },
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
      throw new InternalServerErrorException('Failed to fetch disputes by user id', error);
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

      return { resolved, inProgress, open, rejected };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get disputes status count by user id', error);
    }
  }

  async updateDisputeStatus(disputeId: string, status: DisputeStatus) {
    try {
      const updatedDispute = await this.db.dispute.update({
        where: { id: disputeId },
        data: { status },
      });
      return updatedDispute;
    } catch (error) {
      throw new InternalServerErrorException('Failed to update dispute status.', error);
    }
  }






}
