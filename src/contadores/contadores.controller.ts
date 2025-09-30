import { Controller, Get, Post, Body, ValidationPipe, Param, Query, UseInterceptors, UploadedFile, BadRequestException, Res, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContadoresService } from './contadores.service';
import { CreateContadorDto } from './dto/create-contador.dto';
import { memoryStorage } from 'multer';
import type { Response } from 'express';

@Controller('contadores')
export class ContadoresController {
  constructor(private readonly contadoresService: ContadoresService) {}

  @Post()
  @UseInterceptors(FileInterceptor('fotoMedidor', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
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
    if (!body.nroApartamento || !body.nroApartamento.trim()) errors.push('Número de apartamento es requerido');
    if (!body.numeroMedicion || !body.numeroMedicion.trim()) errors.push('Número de medición es requerido');

    if (errors.length > 0) {
      throw new BadRequestException(errors.join(', '));
    }

    const createContadorDto: CreateContadorDto = {
      dni: body.dni.trim(),
      nombre: body.nombre.trim(),
      apellidos: body.apellidos.trim(),
      habitacion: body.nroApartamento.trim(), // Del formulario viene como 'nroApartamento'
      numeroMedidor: body.numeroMedidor?.trim() || `MED-${body.nroApartamento}-${Date.now()}`,
      numeroMedicion: body.numeroMedicion.trim(),
      fechaLectura: new Date(body.fechaLectura || body.timestamp || new Date()),
      fotoMedidor: undefined, // deprecado filesystem
      observaciones: body.observaciones?.trim() || undefined,
    };

    const contador = await this.contadoresService.createWithImage(createContadorDto, file);
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

  @Get(':id/foto/:filename')
  async getFoto(
    @Param('id') id: string,
    @Param('filename') filename: string,
    @Res() res: Response
  ) {
    const contador = await this.contadoresService.findById(id);
    if (!contador || !contador.fotoMedidorData || contador.fotoMedidorData.filename !== filename) {
      throw new NotFoundException('Foto no encontrada');
    }
    res.setHeader('Content-Type', contador.fotoMedidorData.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', contador.fotoMedidorData.size?.toString() || '0');
    res.send(contador.fotoMedidorData.data);
  }
}
