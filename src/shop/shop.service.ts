import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { generateShopCode } from '../../utils/index';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class ShopService {
    constructor(private db: DatabaseService, private cloudinaryService: CloudinaryService) { }

    // CREATE SHOP
    async createShop(data: any , file: Express.Multer.File) {
        try {
            let parsedData = data; 
            if (typeof data.payload === 'string') { parsedData = JSON.parse(data.payload); }

            const owner = await this.db.user.findUnique({ where: { id: parsedData.owner } });

            if(owner?.isBlocked) throw new BadRequestException('Your account is blocked, You can not create a shop');

            if (!owner) throw new BadRequestException('Owner not found');

            const icon = file ? await this.cloudinaryService.uploadImage(file) : null;

            // shopName name already esit
            const shopNameExists = await this.db.shop.findFirst({ where: { shopName: parsedData.shopName } });

            if (shopNameExists) throw new BadRequestException('Shop name already exists');

            // CREATE SHOP
            const newShop = await this.db.shop.create({
                data: {
                    shopCode: generateShopCode(),
                    shopName: parsedData.shopName,
                    description: parsedData.description,
                    momoNumber: parsedData.momoNumber,
                    email: parsedData.email,
                    address: parsedData.address,
                    city: parsedData.city,
                    ownerId: parsedData.owner,
                    icon,
                },
            });
            return newShop;
        } catch (error) {
            console.log(error)
            // Optional: handle known Prisma errors specifically
            if (error.code === 'P2002') {
                throw new BadRequestException('Shop with this code already exists.');
            }
            if (error.status === 400) {
                throw new BadRequestException(error);
            }
            throw new InternalServerErrorException('Failed to create shop.', error)
        }
    }

    // GET ALL SHOPS
    async getAllShops() {
        try {
            const shops = await this.db.shop.findMany({
                include: {
                    owner: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            userCode: true,
                            isAdmin: true,
                        }
                    }
                },
            });
            return shops;
        } catch (error) {
            console.error('[Get All Shops Error]', error);
            throw error;
        }
    }

    
    // SEARCH SHOP BY IDENTIFIER OR GET ALL SHOPS
    async searchShop(identifier: string) {
        if (identifier === 'all') {
            return this.getAllShops();
        }
        try {

            const shop = await this.db.shop.findMany({
                where: {
                    OR: [
                        { shopCode: identifier },
                        { shopName: { contains: identifier, mode: 'insensitive' } },
                        { momoNumber: identifier },

                    ],
                },
                include: {
                    owner: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            userCode: true,
                            isAdmin: true,
                        }
                    }
                },
            });

            if (!shop || shop.length === 0) throw new NotFoundException('Shop not found');
            return shop;
        } catch (error) {
            console.error('[Search Shop Error]', error);
            throw new InternalServerErrorException('Failed to search shop.', error)
        }
    }

    // edit shop
    async editShop(id: string, data: any) {
        try {
            const shop = await this.db.shop.update({ where: { id }, data });
            return shop;
        } catch (error) {
            console.error('[Edit Shop Error]', error);
            throw error;
        }
    }

    // get user shops
    async getUserShops(userId: string) {
        try {
            const shops = await this.db.shop.findMany({ where: { ownerId: userId } });
            return shops;
        } catch (error) {
            console.error('[Get User Shops Error]', error);
            throw error;
        }
    }

    // delete shop
    async deleteShop(id: string) {
        try {
            const shop = await this.db.shop.delete({ where: { id } });
            return shop;
        } catch (error) {
            console.error('[Delete Shop Error]', error);
            throw error;
        }
    }
}
