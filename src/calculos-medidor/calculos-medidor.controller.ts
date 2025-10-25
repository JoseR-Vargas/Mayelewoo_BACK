import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query, 
  UseInterceptors, 
  UploadedFiles, 
  BadRequestException, 
  Res, 
  NotFoundException 
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CalculosMedidorService } from './calculos-medidor.service';
import { CreateCalculoMedidorDto } from './dto/create-calculo-medidor.dto';
import { memoryStorage } from 'multer';
import type { Response } from 'express';

@Controller('calculos-medidor')
export class CalculosMedidorController {
  constructor(private readonly calculosMedidorService: CalculosMedidorService) {}

  /**
   * Crea un nuevo cálculo de medidor
   * Acepta dos archivos: fotoAnterior y fotoActual
   */
  @Post()
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'fotoAnterior', maxCount: 1 },
    { name: 'fotoActual', maxCount: 1 }
  ], {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB por archivo
  }))
  async create(
    @Body() body: any,
    @UploadedFiles() files: { fotoAnterior?: any[], fotoActual?: any[] }
  ) {
    // Validar campos requeridos
    const errors: string[] = [];
    
    if (!body.nombre || !body.nombre.trim()) errors.push('Nombre es requerido');
    if (!body.apellido || !body.apellido.trim()) errors.push('Apellido es requerido');
    if (!body.dni || !body.dni.trim()) errors.push('DNI es requerido');
    if (!body.habitacion || !body.habitacion.trim()) errors.push('Habitación es requerida');
    if (!body.medicionAnterior || isNaN(parseFloat(body.medicionAnterior))) errors.push('Medición anterior es requerida');
    if (!body.medicionActual || isNaN(parseFloat(body.medicionActual))) errors.push('Medición actual es requerida');
    if (!body.consumoCalculado || isNaN(parseFloat(body.consumoCalculado))) errors.push('Consumo calculado es requerido');
    if (!body.montoTotal || isNaN(parseFloat(body.montoTotal))) errors.push('Monto total es requerido');
    if (!body.precioKWH || isNaN(parseFloat(body.precioKWH))) errors.push('Precio por kWh es requerido');

    if (errors.length > 0) {
      throw new BadRequestException(errors.join(', '));
    }

    // Validar que la medición actual sea mayor a la anterior
    const medicionAnterior = parseFloat(body.medicionAnterior);
    const medicionActual = parseFloat(body.medicionActual);
    
    if (medicionActual <= medicionAnterior) {
      throw new BadRequestException('La medición actual debe ser mayor a la medición anterior');
    }

    // Crear el DTO
    const createCalculoMedidorDto: CreateCalculoMedidorDto = {
      nombre: body.nombre.trim(),
      apellido: body.apellido.trim(),
      dni: body.dni.trim(),
      habitacion: body.habitacion.trim(),
      medicionAnterior: medicionAnterior,
      medicionActual: medicionActual,
      consumoCalculado: parseFloat(body.consumoCalculado),
      montoTotal: parseFloat(body.montoTotal),
      precioKWH: parseFloat(body.precioKWH),
      fechaRegistro: new Date(body.fechaRegistro || new Date()),
      timestamp: body.timestamp ? parseInt(body.timestamp) : Date.now(),
    };

    // Extraer archivos si existen
    const fotoAnterior = files?.fotoAnterior?.[0];
    const fotoActual = files?.fotoActual?.[0];

    const calculo = await this.calculosMedidorService.create(
      createCalculoMedidorDto,
      fotoAnterior,
      fotoActual
    );

    return {
      success: true,
      message: 'Cálculo de medidor registrado exitosamente',
      data: calculo
    };
  }

  /**
   * Obtiene todos los cálculos
   */
  @Get()
  async findAll() {
    const calculos = await this.calculosMedidorService.findAll();
    return {
      success: true,
      data: calculos,
      total: calculos.length
    };
  }

  /**
   * Obtiene cálculos por habitación
   */
  @Get('habitacion/:habitacion')
  async findByHabitacion(@Param('habitacion') habitacion: string) {
    const calculos = await this.calculosMedidorService.findByHabitacion(habitacion);
    return {
      success: true,
      data: calculos,
      total: calculos.length
    };
  }

  /**
   * Obtiene cálculos por DNI
   */
  @Get('dni/:dni')
  async findByDni(@Param('dni') dni: string) {
    const calculos = await this.calculosMedidorService.findByDni(dni);
    return {
      success: true,
      data: calculos,
      total: calculos.length
    };
  }

  /**
   * Obtiene un cálculo específico por ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const calculo = await this.calculosMedidorService.findOne(id);
    if (!calculo) {
      throw new NotFoundException('Cálculo no encontrado');
    }
    return {
      success: true,
      data: calculo
    };
  }

  /**
   * Obtiene la foto de medición anterior
   */
  @Get(':id/foto-anterior')
  async getFotoAnterior(@Param('id') id: string, @Res() res: Response) {
    const resource = await this.calculosMedidorService.getFotoAnteriorResource(id);
    if (!resource) {
      throw new NotFoundException('Foto de medición anterior no encontrada');
    }

    res.set({ 'Content-Type': resource.mimeType, 'Cache-Control': 'public, max-age=31536000' });
    if (resource.type === 'gridfs') {
      resource.stream.on('error', () => res.status(404).end());
      resource.stream.pipe(res);
    } else {
      res.set({ 'Content-Length': resource.data.length });
      res.send(resource.data);
    }
  }

  /**
   * Obtiene la foto de medición actual
   */
  @Get(':id/foto-actual')
  async getFotoActual(@Param('id') id: string, @Res() res: Response) {
    const resource = await this.calculosMedidorService.getFotoActualResource(id);
    if (!resource) {
      throw new NotFoundException('Foto de medición actual no encontrada');
    }

    res.set({ 'Content-Type': resource.mimeType, 'Cache-Control': 'public, max-age=31536000' });
    if (resource.type === 'gridfs') {
      resource.stream.on('error', () => res.status(404).end());
      resource.stream.pipe(res);
    } else {
      res.set({ 'Content-Length': resource.data.length });
      res.send(resource.data);
    }
  }

  /**
   * Obtiene estadísticas de consumo por habitación
   */
  @Get('estadisticas/habitacion/:habitacion')
  async getEstadisticas(@Param('habitacion') habitacion: string) {
    const estadisticas = await this.calculosMedidorService.getEstadisticasByHabitacion(habitacion);
    
    if (!estadisticas) {
      throw new NotFoundException('No se encontraron registros para esta habitación');
    }

    return {
      success: true,
      data: estadisticas
    };
  }
}
