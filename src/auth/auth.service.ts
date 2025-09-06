import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userModel.findOne({ email, isActive: true });
    
    if (user && await bcrypt.compare(password, user.password)) {
      const { password: userPassword, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // Actualizar último login
    await this.userModel.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    const payload = { 
      email: user.email, 
      sub: user._id, 
      role: user.role 
    };

    return {
      success: true,
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    };
  }

  async createInitialUser(): Promise<void> {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

    if (!adminEmail || !adminPassword) {
      console.error('Variables de entorno ADMIN_EMAIL y ADMIN_PASSWORD son requeridas');
      return;
    }

    const existingUser = await this.userModel.findOne({ email: adminEmail });
    
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      const adminUser = new this.userModel({
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        isActive: true
      });

      await adminUser.save();
      console.log(`Usuario administrador creado: ${adminEmail}`);
    }
  }
}
