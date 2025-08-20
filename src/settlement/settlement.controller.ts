import { Controller,Get } from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { IsAdminGuard } from 'src/common/guards/is-admin.guard';
import { UseGuards } from '@nestjs/common';

@Controller('settlement')
export class SettlementController {
    constructor(private readonly settlementService: SettlementService) {}

    @UseGuards(JwtAuthGuard, IsAdminGuard)
    @Get()
    async getAllSettlements() {
        try {
            return this.settlementService.getAllSettlements();
        } catch (error) {
            
        }
    }
    

}
