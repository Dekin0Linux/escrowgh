import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaClient,Prisma } from '@prisma/client';



@Controller('user')
export class UserController {
    constructor(private user:UserService){}

    @Get()
    getUsers(){
        return this.user.getAllUsers();
    }

    @Post()
    addNew(@Body() data:Prisma.UserCreateInput){
        return  this.user.createUser(data);
    }

    @Post('login')
    loginUser(@Body() data:{phone:string,password:string}){
        return this.user.loginUser(data);
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
