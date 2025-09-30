import { Controller, Get, Post, Body, ValidationPipe, Param, UseInterceptors, UploadedFiles, Res, NotFoundException } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { memoryStorage } from 'multer';
import type { Response } from 'express';

@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', 10, {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  async create(
    @Body() body: any,
    @UploadedFiles() files: any[]
  ) {
    // Convertir monto string a número
    const monto = parseFloat(body.monto?.toString().replace(',', '.') || '0');
    
    // Preparar datos para el DTO
    const createVoucherDto: CreateVoucherDto = {
      nombre: body.nombre,
      apellido: body.apellido,
      dni: body.dni,
      email: body.email,
      ref4: body.ref4,
      hab: body.hab,
      monto: monto,
      timestamp: new Date(body.timestamp || new Date()),
      fotos: [] // deprecated para almacenamiento en DB
    };

    const voucher = await this.vouchersService.createWithImages(createVoucherDto, files || []);
    return {
      success: true,
      message: 'Voucher registrado exitosamente',
      data: voucher
    };
  }

  @Get(":id/image/:filename")
  async getImage(
    @Param('id') id: string,
    @Param('filename') filename: string,
    @Res() res: Response
  ) {
    const file = await this.vouchersService.findImage(id, filename);
    if (!file) throw new NotFoundException('Imagen no encontrada');
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.size.toString());
    res.send(file.data);
  }

  @Get()
  async findAll() {
    const vouchers = await this.vouchersService.findAll();
    return {
      success: true,
      data: vouchers,
      total: vouchers.length
    };
  }

  @Get('habitacion/:hab')
  async findByHabitacion(@Param('hab') hab: string) {
    const vouchers = await this.vouchersService.findByHabitacion(hab);
    return {
      success: true,
      data: vouchers,
      total: vouchers.length
    };
  }

  @Get('dni/:dni')
  async findByDni(@Param('dni') dni: string) {
    const vouchers = await this.vouchersService.findByDni(dni);
    return {
      success: true,
      data: vouchers,
      total: vouchers.length
    };
  }
}
