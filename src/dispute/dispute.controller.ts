import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { DisputeService } from './dispute.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { IsAdminGuard } from 'src/common/guards/is-admin.guard';

@Controller('dispute')
export class DisputeController {
    constructor(private readonly disputeService: DisputeService) { }

    // get all disputes
    @UseGuards(JwtAuthGuard, IsAdminGuard)
    @Get()
    getAllDisputes() {
        return this.disputeService.getAllDisputes();
    }

    // CREATE DISPUTE 
    /*
    @param id: string
    @param reason: string
    @param req: Request
    */
    @UseGuards(JwtAuthGuard)
    @Post(':id')
    createDispute(@Param('id') id: string, @Body('reason') reason: string, @Request() req) {
        return this.disputeService.createDispute(id, req.user.userId, reason);
    }

    

    // SETTLE DISPUTE
    @UseGuards(JwtAuthGuard, IsAdminGuard)
    @Post(':id/settle')
    settleDispute(@Param('id') id: string, @Body('settleToBuyer') settleToBuyer: boolean) {
        return this.disputeService.settleDispute(id, settleToBuyer);
    }

    @UseGuards(JwtAuthGuard)
    @Get('getDisputesByStatus')
    async getDisputes(@Query('status') status?: string) {
        return this.disputeService.getDisputesByStatus(status);
    }


    @UseGuards(JwtAuthGuard)
    @Get('userDisputes/:id')
    async getDisputesByTransactionId(@Param('id') id: string) {
        return this.disputeService.getDisputesByUserId(id);
    }

    // get the count of each dispute status
    /*
    @param userId: string 
    */
    @UseGuards(JwtAuthGuard)
    @Get('disputeStatusCount/:id')
    async getDisputesStatusCount(@Param('id') id: string) {
        return this.disputeService.getDisputesStatusCountByUserId(id);
    }


}
