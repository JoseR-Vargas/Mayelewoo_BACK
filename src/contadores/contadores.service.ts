import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contador, ContadorDocument } from './schemas/contador.schema';
import { CreateContadorDto } from './dto/create-contador.dto';

@Injectable()
export class ContadoresService {
  constructor(
    @InjectModel(Contador.name) private contadorModel: Model<ContadorDocument>,
  ) {}

  async create(createContadorDto: CreateContadorDto): Promise<Contador> {
    // Calcular el consumo
    const consumo = createContadorDto.lecturaActual - createContadorDto.lecturaAnterior;
    
    const createdContador = new this.contadorModel({
      ...createContadorDto,
      consumo,
      estado: 'activo'
    });

    return createdContador.save();
  }

  async findAll(): Promise<Contador[]> {
    return this.contadorModel.find().sort({ createdAt: -1 });
  }

  async findByHabitacion(habitacion: string): Promise<Contador[]> {
    return this.contadorModel.find({ habitacion }).sort({ createdAt: -1 });
  }

  async findByDni(dni: string): Promise<Contador[]> {
    return this.contadorModel.find({ dni }).sort({ createdAt: -1 });
  }

  async getDashboardStats() {
    const totalRegistros = await this.contadorModel.countDocuments();
    const consumoTotal = await this.contadorModel.aggregate([
      { $group: { _id: null, total: { $sum: '$consumo' } } }
    ]);

    const consumoPorHabitacion = await this.contadorModel.aggregate([
      {
        $group: {
          _id: '$habitacion',
          totalConsumo: { $sum: '$consumo' },
          ultimaLectura: { $max: '$fechaLectura' },
          registros: { $sum: 1 }
        }
      },
      { $sort: { totalConsumo: -1 } }
    ]);

    const lecturasMensuales = await this.contadorModel.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$fechaLectura' },
            month: { $month: '$fechaLectura' }
          },
          lecturas: { $sum: 1 },
          consumoTotal: { $sum: '$consumo' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    return {
      totalRegistros,
      consumoTotal: consumoTotal[0]?.total || 0,
      consumoPorHabitacion,
      lecturasMensuales
    };
  }

  async getContadoresLuzStats() {
    const lecturas = await this.contadorModel.find()
      .select('habitacion nombre apellidos lecturaActual lecturaAnterior consumo fechaLectura numeroMedidor')
      .sort({ fechaLectura: -1 })
      .limit(50);

    const habitacionesActivas = await this.contadorModel.distinct('habitacion');
    
    const consumoPromedio = await this.contadorModel.aggregate([
      { $group: { _id: null, promedio: { $avg: '$consumo' } } }
    ]);

    return {
      lecturas,
      totalHabitaciones: habitacionesActivas.length,
      consumoPromedio: consumoPromedio[0]?.promedio || 0,
      ultimasLecturas: lecturas.slice(0, 10)
    };
  }
}
