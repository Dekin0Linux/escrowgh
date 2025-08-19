import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, ValidationPipe } from '@nestjs/common';
import { UserService } from './user.service';
// import { PrismaClient,Prisma } from '../../generated/prisma';
import { Prisma } from '@prisma/client';
import { LoginUserDto } from './dto/login-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { IsAdmin } from 'src/common/decorators/is-admin.decorator';
import { IsAdminGuard } from 'src/common/guards/is-admin.guard';



@Controller('user')
export class UserController {
    constructor(private user:UserService){}


    @UseGuards(JwtAuthGuard, IsAdminGuard)
    @Get()
    getUsers(){
        return this.user.getAllUsers();
    }

    @Post()
    addNew(@Body(new ValidationPipe) data:CreateUserDto){
        return  this.user.createUser(data);
    }

    @Post('login')
    loginUser(@Body(new ValidationPipe) data:LoginUserDto){
        return this.user.loginUser(data);
    }

    @Post('resetPassword')
    resetPassword(@Body(new ValidationPipe) data:ResetPasswordDto){
        return this.user.resetPassword(data);
    }

    @UseGuards(JwtAuthGuard, IsAdminGuard)
    @Get(':userCode')
    getUserByUserCode(@Param('userCode') userCode:string){
        return this.user.getUserByUserCode(userCode);
    }


    @UseGuards(JwtAuthGuard)
    @Get(':id')
    getUserById(@Param('id') id:string) : any{
        return this.user.getUserById(id);
    }


    @UseGuards(JwtAuthGuard)
    @Put(':id')
    updateUser(@Param('id') id:string , @Body() data:any){
        return this.user.updateUser(id,data)
    }


    @UseGuards(JwtAuthGuard, IsAdminGuard)
    @Delete(':id')
    deleteUser(@Param('id') id:string){
        return this.user.deleteUser(id)
    }

    @Post('sendOtp')
    sendOtp(@Body(new ValidationPipe) data:{phone:string}){
        return this.user.sendOtp(data.phone);
    }

    @Post('verifyOtp')
    verifyOtp(@Body(new ValidationPipe) data:{phone:string,otp:string}){
        return this.user.verifyPwdOtp(data);
    }

}
