import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { CalculoMedidor, CalculoMedidorDocument } from './schemas/calculo-medidor.schema';
import { CreateCalculoMedidorDto } from './dto/create-calculo-medidor.dto';

@Injectable()
export class CalculosMedidorService {
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
      uploadStream.on('finish', (file) => resolve(file._id));
      uploadStream.end(buffer);
    });
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
      // Subir a GridFS y guardar solo metadatos en el documento
      fotoAnteriorFileId = await this.uploadToGridFS(
        fotoAnterior.buffer,
        fotoAnterior.originalname?.split(/\s+/).join('_') || fotoAnterior.originalname,
        fotoAnterior.mimetype
      );
      fotoAnteriorData = {
        filename: fotoAnterior.originalname?.split(/\s+/).join('_') || fotoAnterior.originalname,
        mimeType: fotoAnterior.mimetype,
        size: fotoAnterior.size,
        data: undefined as any, // no almacenar el buffer en el doc
        uploadedAt: new Date()
      } as any;
    }

    // Procesar foto actual si existe
    let fotoActualFileId: ObjectId | undefined;
    if (fotoActual) {
      // Subir a GridFS y guardar solo metadatos en el documento
      fotoActualFileId = await this.uploadToGridFS(
        fotoActual.buffer,
        fotoActual.originalname?.split(/\s+/).join('_') || fotoActual.originalname,
        fotoActual.mimetype
      );
      fotoActualData = {
        filename: fotoActual.originalname?.split(/\s+/).join('_') || fotoActual.originalname,
        mimeType: fotoActual.mimetype,
        size: fotoActual.size,
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
