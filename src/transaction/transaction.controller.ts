import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { IsAdminGuard } from 'src/common/guards/is-admin.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('transaction')
export class TransactionController {

  constructor(private readonly transactionService: TransactionService) { }

  // Define your endpoints here, e.g.:
  @UseGuards(JwtAuthGuard, IsAdminGuard)
  @Get()
  async getAllTransactions(@Query() paginationDto: { limit?: number; page?: number }) {
    return this.transactionService.getAllTransactions(paginationDto);
  }


  // CREATE TRANSACTION
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Post()
  async create(@Body() dto: CreateTransactionDto, @UploadedFile() file: Express.Multer.File) {
    return this.transactionService.createTransaction(dto, file);
  }


  // UPDATE TRANSACTION STATUS
  @UseGuards(JwtAuthGuard)
  @Post('/update-status')
  async updateTransactionStatus(@Body() dto: { id: string; status: string }) {
    return this.transactionService.updateTransactionStatus(dto.id, dto.status);
  }

  // UPDATE TRANSACTION
  @UseGuards(JwtAuthGuard)
  @Put()
  async updateTransaction(@Body() dto: { id: string; data: CreateTransactionDto }) {
    return this.transactionService.updateTransactionInfo(dto.id, dto.data);
  }

  // get recent transactions
  @UseGuards(JwtAuthGuard)
  @Get('/getRecentTransactions')
  async getRecentTransactions(@Request() req: any) {
    return this.transactionService.getRecentTransactions(req.user.userId);
  }

  //gettransaction status
  @UseGuards(JwtAuthGuard)
  @Get('/getTransactionStatus/:id')
  async getTransactionStatus(@Param('id') id: string) {
    return this.transactionService.getTransactionStatus(id);
  }


  // get transaction by transCode
  @UseGuards(JwtAuthGuard)
  @Get('/getTransactionByCode/:transCode')
  async getTransactionByCode(@Param('transCode') transCode: string) {
    return this.transactionService.getTransactionByCode(transCode);
  }

  // GET TRANSACTION BY ID
  @UseGuards(JwtAuthGuard)
  @Get('/getTransactionById/:id')
  async getTransactionById(@Param('id') id: string) {
    return this.transactionService.getTransactionById(id);
  }

  // delete transaction
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteTransaction(@Param('id') id: string) {
    return this.transactionService.deleteTransaction(id);
  }

  // filter transactions
  @UseGuards(JwtAuthGuard)
  @Get('filter')
  async filterTransactions(@Query() filter: any) {
    const { page, limit, ...filterData } = filter;
    return this.transactionService.filterTransactions(filterData, {
      page: Number(page || 1),
      limit: Number(limit || 10),
    });
  }


  // release funds to seller by buyer 
  @UseGuards(JwtAuthGuard)
  @Post(':id/release')
  releaseFunds(@Param('id') id: string, @Request() req: any) {
    return this.transactionService.releaseFunds(id, req.user.userId);
  }

  // get user statistics
  @UseGuards(JwtAuthGuard)
  @Get('/getUserStatistics/:userId')
  async getUserStatistics(@Param('userId') userId: string) {
    return this.transactionService.getUserStatistics(userId);
  }

  // update isPaid field (User paying fro transactin)
  @UseGuards(JwtAuthGuard)
  @Put('/updateIsPaid/:id')
  async updateIsPaid(@Param('id') id: string, @Body() body: any) {
    return this.transactionService.updateIsPaid(id, body);
  }

  // get users transactions
  @UseGuards(JwtAuthGuard)
  @Get('/getUserTransactions/:userId')
  async getUserTransactions(@Param('userId') userId: string) {
    return this.transactionService.getUserTransactions(userId);
  }



}
