import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CalculoMedidor, CalculoMedidorDocument } from './schemas/calculo-medidor.schema';
import { CreateCalculoMedidorDto } from './dto/create-calculo-medidor.dto';

@Injectable()
export class CalculosMedidorService {
  constructor(
    @InjectModel(CalculoMedidor.name) private calculoMedidorModel: Model<CalculoMedidorDocument>,
  ) {}

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
    if (fotoAnterior) {
      fotoAnteriorData = {
        filename: fotoAnterior.originalname?.split(/\s+/).join('_') || fotoAnterior.originalname,
        mimeType: fotoAnterior.mimetype,
        size: fotoAnterior.size,
        data: fotoAnterior.buffer,
        uploadedAt: new Date()
      };
    }

    // Procesar foto actual si existe
    if (fotoActual) {
      fotoActualData = {
        filename: fotoActual.originalname?.split(/\s+/).join('_') || fotoActual.originalname,
        mimeType: fotoActual.mimetype,
        size: fotoActual.size,
        data: fotoActual.buffer,
        uploadedAt: new Date()
      };
    }

    const created = new this.calculoMedidorModel({
      ...createCalculoMedidorDto,
      fotoAnteriorData,
      fotoActualData,
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
  async getFotoAnterior(id: string): Promise<{ data: Buffer; mimeType: string } | null> {
    const calculo = await this.calculoMedidorModel.findById(id);
    if (!calculo || !calculo.fotoAnteriorData) {
      return null;
    }
    return {
      data: calculo.fotoAnteriorData.data,
      mimeType: calculo.fotoAnteriorData.mimeType
    };
  }

  /**
   * Obtiene la imagen de la medición actual
   */
  async getFotoActual(id: string): Promise<{ data: Buffer; mimeType: string } | null> {
    const calculo = await this.calculoMedidorModel.findById(id);
    if (!calculo || !calculo.fotoActualData) {
      return null;
    }
    return {
      data: calculo.fotoActualData.data,
      mimeType: calculo.fotoActualData.mimeType
    };
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
