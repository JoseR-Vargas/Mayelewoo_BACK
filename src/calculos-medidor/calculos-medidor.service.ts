import { Injectable, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { CalculoMedidor, CalculoMedidorDocument } from './schemas/calculo-medidor.schema';
import { CreateCalculoMedidorDto } from './dto/create-calculo-medidor.dto';
import * as sharpModule from 'sharp';
const sharp = sharpModule.default || sharpModule;

@Injectable()
export class CalculosMedidorService {
  private readonly logger = new Logger(CalculosMedidorService.name);

  constructor(
    @InjectModel(CalculoMedidor.name) private calculoMedidorModel: Model<CalculoMedidorDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  private getBucket(): GridFSBucket {
    // Non-null assertion because connection.db is set when Mongoose is connected
    return new GridFSBucket(this.connection.db as any, { bucketName: 'calculosMedidor' });
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
        .jpeg({ quality: 80 }) // Convertir a JPEG con calidad 80%
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

  /**
   * Crea un nuevo cálculo de medidor con imágenes opcionales
   */
  async create(
    createCalculoMedidorDto: CreateCalculoMedidorDto,
    fotoAnterior?: any,
    fotoActual?: any
  ): Promise<any> {
    let fotoAnteriorData: {
      filename: string;
      mimeType: string;
      size: number;
      data: Buffer;
      uploadedAt: Date;
    } | undefined = undefined;

    let fotoActualData: {
      filename: string;
      mimeType: string;
      size: number;
      data: Buffer;
      uploadedAt: Date;
    } | undefined = undefined;

    // Procesar foto anterior si existe
    let fotoAnteriorFileId: ObjectId | undefined;
    if (fotoAnterior) {
      // Comprimir imagen antes de subir
      const compressed = await this.compressImage(fotoAnterior.buffer, fotoAnterior.mimetype);
      
      // Subir a GridFS y guardar solo metadatos en el documento
      fotoAnteriorFileId = await this.uploadToGridFS(
        compressed.buffer,
        fotoAnterior.originalname?.split(/\s+/).join('_') || fotoAnterior.originalname,
        compressed.mimeType
      );
      fotoAnteriorData = {
        filename: fotoAnterior.originalname?.split(/\s+/).join('_') || fotoAnterior.originalname,
        mimeType: compressed.mimeType,
        size: compressed.size,
        data: undefined as any, // no almacenar el buffer en el doc
        uploadedAt: new Date()
      } as any;
    }

    // Procesar foto actual si existe
    let fotoActualFileId: ObjectId | undefined;
    if (fotoActual) {
      // Comprimir imagen antes de subir
      const compressed = await this.compressImage(fotoActual.buffer, fotoActual.mimetype);
      
      // Subir a GridFS y guardar solo metadatos en el documento
      fotoActualFileId = await this.uploadToGridFS(
        compressed.buffer,
        fotoActual.originalname?.split(/\s+/).join('_') || fotoActual.originalname,
        compressed.mimeType
      );
      fotoActualData = {
        filename: fotoActual.originalname?.split(/\s+/).join('_') || fotoActual.originalname,
        mimeType: compressed.mimeType,
        size: compressed.size,
        data: undefined as any,
        uploadedAt: new Date()
      } as any;
    }

    const created = new this.calculoMedidorModel({
      ...createCalculoMedidorDto,
      fotoAnteriorData,
      fotoActualData,
      fotoAnteriorFileId,
      fotoActualFileId,
    });

    await created.save();
    return this.transformCalculoWithImageUrls(created);
  }

  /**
   * Obtiene todos los cálculos ordenados por fecha de registro descendente
   */
  async findAll(): Promise<any[]> {
    const calculos = await this.calculoMedidorModel.find().sort({ fechaRegistro: -1 });
    return calculos.map(calculo => this.transformCalculoWithImageUrls(calculo));
  }

  /**
   * Busca cálculos por habitación
   */
  async findByHabitacion(habitacion: string): Promise<any[]> {
    const calculos = await this.calculoMedidorModel
      .find({ habitacion })
      .sort({ fechaRegistro: -1 });
    return calculos.map(calculo => this.transformCalculoWithImageUrls(calculo));
  }

  /**
   * Busca cálculos por DNI
   */
  async findByDni(dni: string): Promise<any[]> {
    const calculos = await this.calculoMedidorModel
      .find({ dni })
      .sort({ fechaRegistro: -1 });
    return calculos.map(calculo => this.transformCalculoWithImageUrls(calculo));
  }

  /**
   * Obtiene un cálculo por ID
   */
  async findOne(id: string): Promise<any> {
    const calculo = await this.calculoMedidorModel.findById(id);
    if (!calculo) {
      return null;
    }
    return this.transformCalculoWithImageUrls(calculo);
  }

  /**
   * Obtiene la imagen de la medición anterior
   */
  async getFotoAnteriorResource(id: string): Promise<
    | { type: 'gridfs'; stream: NodeJS.ReadableStream; mimeType: string }
    | { type: 'buffer'; data: Buffer; mimeType: string }
    | null
  > {
    const calculo = await this.calculoMedidorModel.findById(id);
    if (!calculo) return null;

    // Si existe archivo en GridFS
    if (calculo.fotoAnteriorFileId) {
      const bucket = this.getBucket();
  const stream = bucket.openDownloadStream(new ObjectId(calculo.fotoAnteriorFileId as any));
      const mime = calculo.fotoAnteriorData?.mimeType || 'application/octet-stream';
      return { type: 'gridfs', stream, mimeType: mime };
    }

    // Fallback a buffer embebido (compatibilidad)
    if (calculo.fotoAnteriorData?.data) {
      return { type: 'buffer', data: calculo.fotoAnteriorData.data as any, mimeType: calculo.fotoAnteriorData.mimeType };
    }
    return null;
  }

  /**
   * Obtiene la imagen de la medición actual
   */
  async getFotoActualResource(id: string): Promise<
    | { type: 'gridfs'; stream: NodeJS.ReadableStream; mimeType: string }
    | { type: 'buffer'; data: Buffer; mimeType: string }
    | null
  > {
    const calculo = await this.calculoMedidorModel.findById(id);
    if (!calculo) return null;

    if (calculo.fotoActualFileId) {
      const bucket = this.getBucket();
  const stream = bucket.openDownloadStream(new ObjectId(calculo.fotoActualFileId as any));
      const mime = calculo.fotoActualData?.mimeType || 'application/octet-stream';
      return { type: 'gridfs', stream, mimeType: mime };
    }

    if (calculo.fotoActualData?.data) {
      return { type: 'buffer', data: calculo.fotoActualData.data as any, mimeType: calculo.fotoActualData.mimeType };
    }
    return null;
  }

  /**
   * Transforma el documento agregando URLs para las imágenes
   */
  private transformCalculoWithImageUrls(calculo: any): any {
    const calculoObj = calculo.toObject ? calculo.toObject() : calculo;
    
    // Eliminar los buffers de datos de la respuesta para aliviar payload
    const transformed = { ...calculoObj };
    
    if (transformed.fotoAnteriorData) {
      delete transformed.fotoAnteriorData.data;
      transformed.fotoAnteriorUrl = `/api/calculos-medidor/${calculo._id}/foto-anterior`;
    }
    
    if (transformed.fotoActualData) {
      delete transformed.fotoActualData.data;
      transformed.fotoActualUrl = `/api/calculos-medidor/${calculo._id}/foto-actual`;
    }
    
    return transformed;
  }

  /**
   * Obtiene estadísticas de consumo por habitación
   */
  async getEstadisticasByHabitacion(habitacion: string): Promise<any> {
    const calculos = await this.calculoMedidorModel
      .find({ habitacion })
      .sort({ fechaRegistro: -1 });

    if (calculos.length === 0) {
      return null;
    }

    const totalConsumo = calculos.reduce((sum, calc) => sum + calc.consumoCalculado, 0);
    const totalMonto = calculos.reduce((sum, calc) => sum + calc.montoTotal, 0);
    const promedioConsumo = totalConsumo / calculos.length;
    const promedioMonto = totalMonto / calculos.length;

    return {
      habitacion,
      totalRegistros: calculos.length,
      totalConsumo,
      totalMonto,
      promedioConsumo,
      promedioMonto,
      ultimaLectura: calculos[0],
    };
  }
}
