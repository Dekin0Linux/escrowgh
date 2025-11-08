import { Injectable, NotFoundException, BadRequestException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
const { generateUserCode } = require('../../utils/index');
import { PrismaClient, Prisma } from '@prisma/client';
const { comparePassword, hashPassword } = require('../../utils/hashpwd');
import { JwtService } from '@nestjs/jwt';
import { sendSMS } from 'utils/sms';
import { generateOTP, verifyOTP } from 'utils/otp'
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { IsAdminGuard } from 'src/common/guards/is-admin.guard';


@Injectable()
export class UserService {
  constructor(private readonly db: DatabaseService,
    private readonly jwtService: JwtService
  ) { }


  private generateToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      isAdmin: user.isAdmin,
      isBlocked: user.isBlocked,
    };

    return this.jwtService.sign(payload);
  }

  // get user statiics totalusers, active users , admin users
  @UseGuards(JwtAuthGuard, IsAdminGuard)
  async getUserStatistics() {
    const totalUsers = await this.db.user.count();
    const activeUsers = 0 // await this.db.user.count({ where: { isBlocked: false } });
    const adminUsers = await this.db.user.count({ where: { isAdmin: true } });
    return { totalUsers, activeUsers, adminUsers };
  }

  // GET ALL USERS
  @UseGuards(JwtAuthGuard, IsAdminGuard)
  async getAllUsers() {
    const users = await this.db.user.findMany();
    return users.map(({ password, ...rest }) => rest); //exclude pwd
  }

  // CREATE USER
  async createUser(data: any) {
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

      let smsMsg = `Welcome ${newUser.name}, your account has been created successfully. Please login to your account to start using our services.`;
      sendSMS(newUser?.phone!, smsMsg);

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
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        console.log(error)
        throw error;
      }
      throw new InternalServerErrorException('Could not create user');
    }
  }


  async loginUser(data: { phone: string; password: string }) {
    try {
      const user = await this.db.user.findUnique({ where: { phone: data.phone } });
      if (!user) throw new NotFoundException('User not found');

      if (user.isBlocked) {
        throw new ForbiddenException('Your account has been blocked. Please contact support.');
      }

      const isMatch = await comparePassword(data.password, user.password);
      if (!isMatch) throw new BadRequestException('Invalid Credentials');

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

    } catch (error) {
      console.error('Login error:', error);

      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error; // ✅ Let NestJS handle known HTTP errors
      }

      // ✅ For unknown/unexpected errors, send a generic message
      throw new BadRequestException('Something went wrong during login');
    }
  }

  // GET USER BY USERCODE
  @UseGuards(JwtAuthGuard)
  async getUserByUserCode(userCode: string) {
    try {
      const user = await this.db.user.findUnique({ where: { userCode } });
      if (!user) throw new NotFoundException('User not found');
      //remove password
      const { password, ...rest } = user;

      return { message: "User found", user: rest };
    } catch (error) {
      throw new NotFoundException('User not found');
    }
  }

  @UseGuards(JwtAuthGuard)
  async getUserById(id: string) {
    const user = await this.db.user.findUnique({
      where: { id }, select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        userCode: true,
      }
    });
    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  @UseGuards(JwtAuthGuard)
  async updateUser(id: string, data: any) {
    try {
      await this.db.user.update({
        where: { id },
        data,
      });
      return { message: "User updated successfully" }
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error; // ✅ Let NestJS handle known HTTP errors
      }
      throw new BadRequestException('Failed to update user');
    }
  }


  @UseGuards(JwtAuthGuard, IsAdminGuard)
  async deleteUser(id: string) {
    try {
      await this.db.user.delete({ where: { id } });
      return { message: "User deleted successfully" }
    } catch (error) {
      
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error; // ✅ Let NestJS handle known HTTP errors
      }
      throw new NotFoundException('User not found');
    }
  }

  async sendOtp(phone: string) {
    console.log(phone)
    try {
      const findUser = await this.db.user.findFirst({ where: { phone: phone } });
      if (!findUser) {
        throw new NotFoundException('User not found');
      }
      generateOTP(phone)
    } catch (error) {
      
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error; // ✅ Let NestJS handle known HTTP errors
      }
      throw new BadRequestException(error);
    }
  }

  async verifyPwdOtp(data: { phone: string; otp: string }) {
    try {
      const findUser = await this.db.user.findFirst({ where: { phone: data.phone } });
      if (!findUser) {
        throw new NotFoundException('User not found');
      }
      let resp = await verifyOTP(data.otp, findUser?.phone)
      console.log(resp)
      if(resp.code === '1104'){
        throw new BadRequestException(resp);
      }
      return {message:"Otp verified successfully"}
    } catch (error) {
      
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error; // ✅ Let NestJS handle known HTTP errors
      }
      throw new BadRequestException(error);
    }
  }

  // change password new password, old password check if old password is same and store in DB before update get user by id from Req
  async changePassword(data: { oldPassword: string; newPassword: string},id:string) {
    try {
      const user = await this.db.user.findUnique({ where: { id } });
      if (!user) throw new NotFoundException('User not found');
      const isMatch = await comparePassword(data.oldPassword, user.password);
      if (!isMatch) throw new BadRequestException('Invalid old password');
      const hashedPassword = await hashPassword(data.newPassword);
      await this.db.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
      return { message: "User password changed successfully" }
    } catch (error) {
      
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error; // ✅ Let NestJS handle known HTTP errors
      }
      throw new BadRequestException('Failed to change password');
    }
  }
  


  async resetPassword(data: { phone: string; password: string }) {
    try {
      const user = await this.db.user.findUnique({ where: { phone: data.phone } });
      if (!user) throw new NotFoundException('User not found');
      const hashedPassword = await hashPassword(data.password);
      await this.db.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      // return success message
      return { message: "User password reset successfully" }

    } catch (error) {
      throw new BadRequestException('Failed to reset password');
    }
  }


  async updatePushToken(userId: string, token: string) {
    // update or create the push token for the user
    return await this.db.user.update({
      where: { id: userId },
      data: { expoToken: token },
    });
  }

  // block user &
  @UseGuards(JwtAuthGuard, IsAdminGuard)
  async blockUser(id: string) {
    try {
      await this.db.user.update({
        where: { id },
        data: { isBlocked: true },
      });
      return { message: "User blocked successfully" }
    } catch (error) {
      throw new NotFoundException('User not found');
    }
  }

  @UseGuards(JwtAuthGuard, IsAdminGuard)
  async unblockUser(id: string) {
    try {
      await this.db.user.update({
        where: { id },
        data: { isBlocked: false },
      });
      return { message: "User unblocked successfully" }
    } catch (error) {
      throw new NotFoundException('User not found');
    }
  }




}
