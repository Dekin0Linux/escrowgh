import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { UserService } from './user.service';
// import { PrismaClient,Prisma } from '../../generated/prisma';
import { Prisma } from '@prisma/client';



@Controller('user')
export class UserController {
    constructor(private user:UserService){}

    @Get()
    getUsers(){
        return this.user.getAllUsers();
    }

    @Post()
    addNew(@Body() data:any){
        return  this.user.createUser(data);
    }

    @Post('login')
    loginUser(@Body() data:{phone:string,password:string}){
        return this.user.loginUser(data);
    }

    @Post('reset-password')
    resetPassword(@Body() data:{phone:string,password:string}){
        return this.user.resetPassword(data);
    }

    @Get(':userCode')
    getUserByUserCode(@Param('userCode') userCode:string){
        return this.user.getUserByUserCode(userCode);
    }

    @Get(':id')
    getUserById(@Param('id') id:string) : any{
        return this.user.getUserById(id);
    }

    @Put(':id')
    updateUser(@Param('id') id:string , @Body() data:any){
        return this.user.updateUser(id,data)
    }

    @Delete(':id')
    deleteUser(@Param('id') id:string){
        return this.user.deleteUser(id)
    }
}
