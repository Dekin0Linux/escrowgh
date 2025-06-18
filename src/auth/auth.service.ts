// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { UserService }  from '../user/user.service';
import {DatabaseService} from '../database/database.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
    private db:DatabaseService
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.db.user.findUnique({ where: { email } });
    if (user && await bcrypt.compare(password, user.password)) {
      return user;
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email, isAdmin: user.isAdmin };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }
}
