import { Body, Controller, Get, Param, Post, Put, Query, Request, UploadedFile, UseGuards,UseInterceptors } from '@nestjs/common';
import { DisputeService } from './dispute.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { IsAdminGuard } from 'src/common/guards/is-admin.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth() 
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
    @UseInterceptors(FileInterceptor('file'))
    @Post(':id')
    createDispute(@Param('id') id: string, @Body() payload: any, @Request() req: any, @UploadedFile() file: Express.Multer.File) {
        return this.disputeService.createDispute(req.user.userId, payload, file);
    }

    // SETTLE DISPUTE
    @UseGuards(JwtAuthGuard, IsAdminGuard)
    @Post('settleDispute/:id')
    settleDispute(@Param('id') id: string, @Body('settleToBuyer') settleToBuyer: boolean, @Body('resolution') resolution: string, @Body('resolvedBy') resolvedBy: string) {
        return this.disputeService.settleDispute(id, settleToBuyer,resolution,resolvedBy);
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

    //update dispute status
    @UseGuards(JwtAuthGuard,IsAdminGuard)
    @Put('updateDisputeStatus/:id')
    async updateDisputeStatus(@Param('id') id: string, @Body('status') status: any) {
        return this.disputeService.updateDisputeStatus(id, status);
    }


}
