import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { generateUserCode } from 'utils';
import { PrismaClient,Prisma } from '@prisma/client';
import { comparePassword, hashPassword } from 'utils/hashpwd';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserService {
  constructor(private readonly db: DatabaseService,
    private readonly jwtService: JwtService
  ) {}

  private generateToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      isAdmin: user.isAdmin,
    };
  
    return this.jwtService.sign(payload);
  }

  async getAllUsers() {
    const users = await this.db.user.findMany();
    return users.map(({ password, ...rest }) => rest); //exclude pwd
  }


  async createUser(data: Prisma.UserCreateInput) {
    try {
      const hashedPassword = await hashPassword(data.password);
      const newUser = await this.db.user.create({
        data: {
          ...data,
          userCode: generateUserCode(),
          password: hashedPassword,
        },
      });
  
      const access_token = this.generateToken(newUser);
  
      return {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          userCode: newUser.userCode,
          isAdmin: newUser.isAdmin,
        },
        access_token,
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException(`Duplicate field: ${error.meta?.target}`);
      }
      throw new BadRequestException('Could not create user');
    }
  }


  async loginUser(data: { phone: string; password: string }) {
    const user = await this.db.user.findUnique({ where: { phone: data.phone } });
    if (!user) throw new NotFoundException('User not found');
  
    const isMatch = await comparePassword(data.password, user.password);
    if (!isMatch) throw new BadRequestException('Invalid password');
  
    const access_token = this.generateToken(user);
  
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        userCode: user.userCode,
        isAdmin: user.isAdmin,
      },
      access_token,
    };
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
