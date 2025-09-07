import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Voucher, VoucherDocument } from './schemas/voucher.schema';
import { CreateVoucherDto } from './dto/create-voucher.dto';

@Injectable()
export class VouchersService {
  constructor(@InjectModel(Voucher.name) private voucherModel: Model<VoucherDocument>) {}

  async create(createVoucherDto: CreateVoucherDto): Promise<Voucher> {
    const voucher = new this.voucherModel(createVoucherDto);
    return voucher.save();
  }

  async findAll(): Promise<Voucher[]> {
    const vouchers = await this.voucherModel.find().sort({ createdAt: -1 }).exec();
    return vouchers.map(voucher => this.transformVoucherWithImageUrls(voucher));
  }

  async findByDni(dni: string): Promise<Voucher[]> {
    const vouchers = await this.voucherModel.find({ dni }).sort({ createdAt: -1 }).exec();
    return vouchers.map(voucher => this.transformVoucherWithImageUrls(voucher));
  }

  async findByHabitacion(hab: string): Promise<Voucher[]> {
    const vouchers = await this.voucherModel.find({ hab }).sort({ createdAt: -1 }).exec();
    return vouchers.map(voucher => this.transformVoucherWithImageUrls(voucher));
  }

  private transformVoucherWithImageUrls(voucher: any): any {
    const transformedVoucher = voucher.toObject ? voucher.toObject() : voucher;
    if (transformedVoucher.fotos && Array.isArray(transformedVoucher.fotos) && transformedVoucher.fotos.length > 0) {
      // Construir URLs completas para las imágenes
      const baseUrl = process.env.BASE_URL || 'https://mayelewoo-back.onrender.com';
      
      transformedVoucher.files = transformedVoucher.fotos.map((foto: string) => ({
        name: foto,
        url: `${baseUrl}/uploads/vouchers/${foto}`
      }));
    }
    return transformedVoucher;
  }

  async findById(id: string): Promise<Voucher | null> {
    return this.voucherModel.findById(id).exec();
  }

  async updateEstado(id: string, estado: string): Promise<Voucher | null> {
    return this.voucherModel.findByIdAndUpdate(id, { estado }, { new: true }).exec();
  }
}
