import { Controller, Get, Post, Body, Param, UseGuards, UploadedFile, UseInterceptors, Delete } from '@nestjs/common';
import { ShopService } from './shop.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { IsAdminGuard } from 'src/common/guards/is-admin.guard';
import { CreateShopDto } from './dto/createShop.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags ,ApiConsumes} from '@nestjs/swagger';

@ApiTags('shops')
@Controller('shop')
export class ShopController {
    constructor(private shopService: ShopService) {}

    // @UseGuards(JwtAuthGuard)
    @Post()
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('file')) 
    async createShop(@Body() data: CreateShopDto, @UploadedFile() file: Express.Multer.File) {
        return this.shopService.createShop(data, file);
    }

    // @UseGuards(JwtAuthGuard)
    @Get()
    async getAllShops() {
        return this.shopService.getAllShops();
    }

    // @UseGuards(JwtAuthGuard)
    @Get('search/:identifier')
    async searchShop(@Param('identifier') identifier?: string) {
        return this.shopService.searchShop(identifier ?? 'all');
    }

    @UseGuards(JwtAuthGuard)
    @Get('userShops/:userId')
    async getUserShops(@Param('userId') userId: string) {
        return this.shopService.getUserShops(userId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    async deleteShop(@Param('id') id: string) {
        return this.shopService.deleteShop(id);
    }
}
