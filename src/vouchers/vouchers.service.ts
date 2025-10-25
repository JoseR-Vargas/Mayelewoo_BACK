import { Injectable, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Voucher, VoucherDocument } from './schemas/voucher.schema';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import * as sharpModule from 'sharp';
const sharp = sharpModule.default || sharpModule;

@Injectable()
export class VouchersService {
  private readonly logger = new Logger(VouchersService.name);

  constructor(
    @InjectModel(Voucher.name) private voucherModel: Model<VoucherDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  private getBucket(): GridFSBucket {
    // Non-null assertion because connection.db is set when Mongoose is connected
    return new GridFSBucket(this.connection.db as any, { bucketName: 'vouchers' });
  }

  private async uploadToGridFS(buffer: Buffer, filename: string, contentType?: string): Promise<ObjectId> {
    const bucket = this.getBucket();
    return new Promise<ObjectId>((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(filename, { contentType });
      uploadStream.on('error', reject);
      uploadStream.on('finish', () => {
        // El ID se obtiene del uploadStream, no del callback
        resolve(uploadStream.id as ObjectId);
      });
      uploadStream.end(buffer);
    });
  }

  /**
   * Comprime una imagen para reducir su tamaño
   * Convierte a JPEG y optimiza el tamaño manteniendo calidad aceptable
   */
  private async compressImage(buffer: Buffer, originalMimeType: string): Promise<{ buffer: Buffer; size: number; mimeType: string }> {
    try {
      const originalSize = buffer.length;
      this.logger.log(`Comprimiendo imagen. Tamaño original: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);

      // Comprimir imagen con sharp
      let compressedBuffer = await sharp(buffer)
        .rotate() // Auto-rotar basado en EXIF
        .resize(1920, 1920, { // Máximo 1920px en cualquier dimensión
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 }) // Convertir a JPEG con calidad 85%
        .toBuffer();

      const compressedSize = compressedBuffer.length;
      const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(2);
      
      this.logger.log(`Imagen comprimida. Tamaño final: ${(compressedSize / 1024 / 1024).toFixed(2)} MB. Reducción: ${reduction}%`);

      return {
        buffer: compressedBuffer,
        size: compressedSize,
        mimeType: 'image/jpeg'
      };
    } catch (error) {
      this.logger.error('Error al comprimir imagen, usando original', error);
      // Si falla la compresión, devolver el original
      return {
        buffer,
        size: buffer.length,
        mimeType: originalMimeType
      };
    }
  }

  async create(createVoucherDto: CreateVoucherDto): Promise<Voucher> {
    const voucher = new this.voucherModel(createVoucherDto);
    return voucher.save();
  }

  async createWithImages(createVoucherDto: CreateVoucherDto, files: any[]): Promise<Voucher> {
    const imagenes: Array<{
      filename: string;
      mimeType: string;
      size: number;
      data?: Buffer;
      uploadedAt: Date;
    }> = [];
    
    const fotoFileIds: ObjectId[] = [];

    // Procesar cada archivo: comprimir y subir a GridFS
    for (const file of files || []) {
      try {
        // Comprimir imagen antes de subir
        const compressed = await this.compressImage(file.buffer, file.mimetype);
        
        // Subir a GridFS
        const filename = file.originalname?.split(/\s+/).join('_') || file.originalname || `img_${Date.now()}`;
        const fileId = await this.uploadToGridFS(
          compressed.buffer,
          filename,
          compressed.mimeType
        );
        
        fotoFileIds.push(fileId);
        
        // Guardar solo metadata (sin buffer) en el documento
        imagenes.push({
          filename: filename,
          mimeType: compressed.mimeType,
          size: compressed.size,
          data: undefined, // No almacenar el buffer en el documento
          uploadedAt: new Date()
        });

        this.logger.log(`Imagen subida a GridFS: ${filename} (ID: ${fileId})`);
      } catch (error) {
        this.logger.error(`Error procesando archivo ${file.originalname}:`, error);
        // Continuar con los demás archivos aunque uno falle
      }
    }

    const voucher = new this.voucherModel({
      ...createVoucherDto,
      imagenes,
      fotoFileIds,
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
    if (!voucher) return null;

    // Buscar el índice de la imagen en el array de imagenes
    const imageIndex = voucher.imagenes?.findIndex((img: any) => img.filename === filename);
    if (imageIndex === undefined || imageIndex === -1) return null;

    // Si existe el archivo en GridFS, usarlo
    if (voucher.fotoFileIds && voucher.fotoFileIds[imageIndex]) {
      const bucket = this.getBucket();
      const fileId = voucher.fotoFileIds[imageIndex];
      const stream = bucket.openDownloadStream(new ObjectId(fileId as any));
      const mime = voucher.imagenes?.[imageIndex]?.mimeType || 'application/octet-stream';
      const size = voucher.imagenes?.[imageIndex]?.size || 0;
      
      return { 
        type: 'gridfs', 
        stream, 
        mimeType: mime,
        size 
      };
    }

    // Fallback a buffer embebido (compatibilidad con datos antiguos)
    const image = voucher.imagenes?.[imageIndex];
    if (image?.data) {
      return { 
        type: 'buffer', 
        data: image.data, 
        mimeType: image.mimeType,
        size: image.size 
      };
    }

    return null;
  }

  async updateEstado(id: string, estado: string): Promise<Voucher | null> {
    return this.voucherModel.findByIdAndUpdate(id, { estado }, { new: true }).exec();
  }
}
