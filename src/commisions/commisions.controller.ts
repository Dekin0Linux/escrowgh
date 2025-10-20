import { Controller, Get, Param } from '@nestjs/common';
import { CommisionsService } from './commisions.service';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('commisions')
export class CommisionsController {
    constructor(private readonly commisionService: CommisionsService) { }


    // GET COMMISSION
    // @UseGuards(JwtAuthGuard)
    @Get('/calculate/:amount')
    async getCommission(@Param('amount') amount: string) {
        const numericAmount = parseFloat(amount);
        return this.commisionService.calculateCommission(numericAmount);
    }
}
