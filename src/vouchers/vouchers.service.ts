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

  async createWithImages(createVoucherDto: CreateVoucherDto, files: any[]): Promise<Voucher> {
    // Mapear archivos a subdocumentos
    const imagenes = (files || []).map(f => ({
      filename: f.originalname?.split(/\s+/).join('_') || f.originalname || `img_${Date.now()}`,
      mimeType: f.mimetype,
      size: f.size,
      data: f.buffer,
      uploadedAt: new Date()
    }));

    const voucher = new this.voucherModel({
      ...createVoucherDto,
      imagenes,
    });

    await voucher.save();
    return this.transformVoucherWithImageUrls(voucher);
  }

  async findAll(): Promise<any[]> {
    const vouchers = await this.voucherModel.find({}, { 'imagenes.data': 0 }).sort({ createdAt: -1 }).exec();
    return vouchers.map(voucher => this.transformVoucherWithImageUrls(voucher));
  }

  async findByDni(dni: string): Promise<any[]> {
    const vouchers = await this.voucherModel.find({ dni }, { 'imagenes.data': 0 }).sort({ createdAt: -1 }).exec();
    return vouchers.map(voucher => this.transformVoucherWithImageUrls(voucher));
  }

  async findByHabitacion(hab: string): Promise<any[]> {
    const vouchers = await this.voucherModel.find({ hab }, { 'imagenes.data': 0 }).sort({ createdAt: -1 }).exec();
    return vouchers.map(voucher => this.transformVoucherWithImageUrls(voucher));
  }

  private transformVoucherWithImageUrls(voucher: any): any {
    const transformedVoucher = voucher.toObject ? voucher.toObject() : voucher;
    let baseUrl = (process.env.BASE_URL || '').trim();
    if (!baseUrl) {
      baseUrl = `http://localhost:${process.env.PORT || 3000}`;
    }
    baseUrl = baseUrl.replace(/\/$/, '');

    // Legacy soporte: fotos en disco
    if (transformedVoucher.fotos && Array.isArray(transformedVoucher.fotos) && transformedVoucher.fotos.length > 0) {
      transformedVoucher.files = transformedVoucher.fotos.map((foto: string) => ({
        name: foto,
        url: `${baseUrl}/uploads/vouchers/${foto}`
      }));
    }

    // Nuevo esquema: imagenes en Mongo
    if (transformedVoucher.imagenes && Array.isArray(transformedVoucher.imagenes) && transformedVoucher.imagenes.length > 0) {
      // Usar URL relativa para que el frontend pueda anteponer su apiBaseUrl (soporta localhost/127.* / producción)
      transformedVoucher.files = [
        ...(transformedVoucher.files || []),
        ...transformedVoucher.imagenes.map((img: any) => ({
          name: img.filename,
          url: `/api/vouchers/${transformedVoucher._id}/image/${encodeURIComponent(img.filename)}`
        }))
      ];
    }
    return transformedVoucher;
  }

  async findById(id: string): Promise<Voucher | null> {
    return this.voucherModel.findById(id).exec();
  }

  async findImage(id: string, filename: string): Promise<any | null> {
    const voucher = await this.voucherModel.findById(id).exec();
    if (!voucher || !voucher.imagenes) return null;
    return voucher.imagenes.find((img: any) => img.filename === filename) || null;
  }

  async updateEstado(id: string, estado: string): Promise<Voucher | null> {
    return this.voucherModel.findByIdAndUpdate(id, { estado }, { new: true }).exec();
  }
}
