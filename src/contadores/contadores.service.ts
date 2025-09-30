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
    // Simplemente guardar los datos tal como vienen del formulario
    const createdContador = new this.contadorModel(createContadorDto);
    return createdContador.save();
  }

  async createWithImage(createContadorDto: CreateContadorDto, file?: any): Promise<any> {
    let fotoMedidorData: {
      filename: string;
      mimeType: string;
      size: number;
      data: Buffer;
      uploadedAt: Date;
    } | undefined = undefined;
    if (file) {
      fotoMedidorData = {
        filename: file.originalname?.split(/\s+/).join('_') || file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        data: file.buffer,
        uploadedAt: new Date()
      };
    }
    const created = new this.contadorModel({
      ...createContadorDto,
      fotoMedidorData,
    });
    await created.save();
    return this.transformContadorWithImageUrl(created);
  }


  async findAll(): Promise<Contador[]> {
    const contadores = await this.contadorModel.find().sort({ createdAt: -1 });
    return contadores.map(contador => this.transformContadorWithImageUrl(contador));
  }

  async findByHabitacion(habitacion: string): Promise<Contador[]> {
    const contadores = await this.contadorModel.find({ habitacion }).sort({ createdAt: -1 });
    return contadores.map(contador => this.transformContadorWithImageUrl(contador));
  }

  async findByDni(dni: string): Promise<Contador[]> {
    const contadores = await this.contadorModel.find({ dni }).sort({ createdAt: -1 });
    return contadores.map(contador => this.transformContadorWithImageUrl(contador));
  }

  private transformContadorWithImageUrl(contador: any): any {
    const transformed = contador.toObject ? contador.toObject() : contador;
    let baseUrl = (process.env.BASE_URL || '').trim();
    if (!baseUrl) baseUrl = `http://localhost:${process.env.PORT || 3000}`;
    baseUrl = baseUrl.replace(/\/$/, '');

    // Legacy filesystem
    if (transformed.fotoMedidor && !transformed.fotoMedidorData) {
      transformed.fotoMedidor = `${baseUrl}/uploads/contadores/${transformed.fotoMedidor}`;
    }

    // Nueva versión embebida: entregar URL relativa para frontend agnóstico
    if (transformed.fotoMedidorData && transformed.fotoMedidorData.filename) {
      transformed.fotoMedidor = `/api/contadores/${transformed._id}/foto/${encodeURIComponent(transformed.fotoMedidorData.filename)}`;
    }
    return transformed;
  }

  async getDashboardStats() {
    const totalRegistros = await this.contadorModel.countDocuments();
    
    const registrosPorHabitacion = await this.contadorModel.aggregate([
      {
        $group: {
          _id: '$habitacion',
          totalRegistros: { $sum: 1 },
          ultimaLectura: { $max: '$fechaLectura' }
        }
      },
      { $sort: { totalRegistros: -1 } }
    ]);

    const lecturasMensuales = await this.contadorModel.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$fechaLectura' },
            month: { $month: '$fechaLectura' }
          },
          lecturas: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    return {
      totalRegistros,
      registrosPorHabitacion,
      lecturasMensuales
    };
  }

  async getContadoresLuzStats() {
    const lecturas = await this.contadorModel.find()
      .select('habitacion nombre apellidos numeroMedicion fechaLectura numeroMedidor')
      .sort({ fechaLectura: -1 })
      .limit(50);

    const habitacionesActivas = await this.contadorModel.distinct('habitacion');

    return {
      lecturas,
      totalHabitaciones: habitacionesActivas.length,
      ultimasLecturas: lecturas.slice(0, 10)
    };
  }

  async findById(id: string): Promise<ContadorDocument | null> {
    return this.contadorModel.findById(id).exec();
  }
}
