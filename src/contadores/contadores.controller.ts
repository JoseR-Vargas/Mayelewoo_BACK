import { Controller, Get, Post, Body, ValidationPipe, Param, Query, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContadoresService } from './contadores.service';
import { CreateContadorDto } from './dto/create-contador.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('contadores')
export class ContadoresController {
  constructor(private readonly contadoresService: ContadoresService) {}

  @Post()
  @UseInterceptors(FileInterceptor('fotoMedidor', {
    storage: diskStorage({
      destination: './uploads/contadores',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        return cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  }))
  async create(
    @Body() body: any,
    @UploadedFile() file: any
  ) {
    // Validar campos requeridos manualmente para FormData
    const errors: string[] = [];
    
    if (!body.dni || !body.dni.trim()) errors.push('DNI es requerido');
    if (!body.nombre || !body.nombre.trim()) errors.push('Nombre es requerido');
    if (!body.apellidos || !body.apellidos.trim()) errors.push('Apellidos es requerido');
    if (!body.habitacion || !body.habitacion.trim()) errors.push('Habitación es requerida');
    if (!body.numeroMedidor || !body.numeroMedidor.trim()) errors.push('Número de medidor es requerido');
    if (!body.lecturaActual || isNaN(parseFloat(body.lecturaActual))) errors.push('Lectura actual debe ser un número válido');
    if (!body.lecturaAnterior || isNaN(parseFloat(body.lecturaAnterior))) errors.push('Lectura anterior debe ser un número válido');

    if (errors.length > 0) {
      throw new BadRequestException(errors.join(', '));
    }

    const createContadorDto: CreateContadorDto = {
      dni: body.dni.trim(),
      nombre: body.nombre.trim(),
      apellidos: body.apellidos.trim(),
      habitacion: body.habitacion.trim(),
      numeroMedidor: body.numeroMedidor.trim(),
      lecturaActual: parseFloat(body.lecturaActual),
      lecturaAnterior: parseFloat(body.lecturaAnterior),
      fechaLectura: new Date(body.fechaLectura || body.timestamp || new Date()),
      fotoMedidor: file ? file.filename : undefined,
      observaciones: body.observaciones || ''
    };

    const contador = await this.contadoresService.create(createContadorDto);
    return {
      success: true,
      message: 'Contador registrado exitosamente',
      data: contador
    };
  }

  @Get()
  async findAll() {
    const contadores = await this.contadoresService.findAll();
    return {
      success: true,
      data: contadores,
      total: contadores.length
    };
  }

  @Get('habitacion/:habitacion')
  async findByHabitacion(@Param('habitacion') habitacion: string) {
    const contadores = await this.contadoresService.findByHabitacion(habitacion);
    return {
      success: true,
      data: contadores,
      total: contadores.length
    };
  }

  @Get('dni/:dni')
  async findByDni(@Param('dni') dni: string) {
    const contadores = await this.contadoresService.findByDni(dni);
    return {
      success: true,
      data: contadores,
      total: contadores.length
    };
  }

  @Get('dashboard/stats')
  async getDashboardStats() {
    const stats = await this.contadoresService.getDashboardStats();
    return {
      success: true,
      data: stats
    };
  }

  @Get('luz/stats')
  async getContadoresLuzStats() {
    const stats = await this.contadoresService.getContadoresLuzStats();
    return {
      success: true,
      data: stats
    };
  }
}
