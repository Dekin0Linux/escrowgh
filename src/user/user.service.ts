import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { generateUserCode } from 'utils';
import { PrismaClient,Prisma } from '@prisma/client';
import { comparePassword, hashPassword } from 'utils/hashpwd';

@Injectable()
export class UserService {
  constructor(private readonly db: DatabaseService) {}

  async getAllUsers() {
    const users = await this.db.user.findMany();
    return users.map(({ password, ...rest }) => rest); //exclude pwd
  }


  async createUser(data: Prisma.UserCreateInput ) {

    try {
      const hashedPassword = await hashPassword(data.password);
      return await this.db.user.create({data:{...data,userCode:generateUserCode(),password:hashedPassword}});
    } catch (error) {
      // Handle Prisma unique constraint error
      if (error.code === 'P2002') {
        console.log(error)
        throw new BadRequestException(`Duplicate field: ${error.meta?.target}`);
      }
      throw new BadRequestException('Could not create user');
    }
  }


  async loginUser(data:{phone:string,password:string}){
    try{
      const user = await this.db.user.findUnique({ where: { phone:data.phone } });
      if (!user) throw new NotFoundException('User not found');
      const isMatch = await comparePassword(data.password, user.password);
      if (!isMatch) throw new BadRequestException('Invalid password');
      return {user,access_token:"1234"};
    }catch(err){
      throw new BadRequestException('Failed to login user');
    }
  }

  async getUserById(id: string) {
    const user = await this.db.user.findUnique({ where: { id },select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        userCode: true,
    } });
    if (!user) throw new NotFoundException('User not found');

    return user;
  }



  async updateUser(id: string, data:any) {
    try {
      return await this.db.user.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw new BadRequestException('Failed to update user');
    }
  }


  async deleteUser(id: string) {
    try {
      return await this.db.user.delete({ where: { id } });
    } catch (error) {
      throw new NotFoundException('User not found');
    }
  }

  async resetPassword(){

  }
}
