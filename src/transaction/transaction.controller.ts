import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { IsAdminGuard } from 'src/common/guards/is-admin.guard';

@Controller('transaction')
export class TransactionController {

  constructor(private readonly transactionService: TransactionService) { }

  // Define your endpoints here, e.g.:
  @UseGuards(JwtAuthGuard,IsAdminGuard)
  @Get()
  async getAllTransactions(@Query() paginationDto: { limit?: number; page?: number }) {
    return this.transactionService.getAllTransactions(paginationDto);
  }

  

  // CREATE TRANSACTION
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateTransactionDto) {
    return this.transactionService.createTransaction(dto);
  }   

  @UseGuards(JwtAuthGuard)
  @Post('update-status')
  async updateTransactionStatus(@Body() dto: { id: string; status: string }) {
    return this.transactionService.updateTransactionStatus(dto.id, dto.status);
  }


  @UseGuards(JwtAuthGuard)
  @Put()
  async updateTransaction(@Body() dto: { id: string; data: CreateTransactionDto }) {
    return this.transactionService.updateTransactionInfo(dto.id, dto.data);
  }

  // get transaction by transCode
  @UseGuards(JwtAuthGuard)
  @Get('/getTransactionByCode/:transCode')
  async getTransactionByCode(@Param('transCode') transCode: string) {
    return this.transactionService.getTransactionByCode(transCode);
  }

  // delete transaction
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteTransaction(@Param('id') id: string) {
    return this.transactionService.deleteTransaction(id);
  }

  


}
