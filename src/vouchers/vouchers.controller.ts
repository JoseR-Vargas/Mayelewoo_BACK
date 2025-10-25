import { Controller, Get, Post, Body, ValidationPipe, Param, UseInterceptors, UploadedFiles, Res, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { memoryStorage } from 'multer';
import type { Response } from 'express';

@Controller('vouchers')
export class VouchersController {
  private readonly logger = new Logger(VouchersController.name);
  
  constructor(private readonly vouchersService: VouchersService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', 10, {
    storage: memoryStorage(),
    limits: { 
      fileSize: 20 * 1024 * 1024, // 20MB por archivo (se comprimirá automáticamente)
      files: 10 // Máximo 10 archivos
    },
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
    try {
      const file = await this.vouchersService.findImage(id, filename);
      if (!file) {
        throw new NotFoundException('Imagen no encontrada');
      }

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Length', file.size.toString());
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache por 1 año

      // Si es GridFS, hacer pipe del stream
      if (file.type === 'gridfs') {
        file.stream.pipe(res);
      } 
      // Si es buffer (datos antiguos), enviar directamente
      else if (file.type === 'buffer') {
        res.send(file.data);
      } else {
        throw new InternalServerErrorException('Tipo de archivo no soportado');
      }
    } catch (error) {
      this.logger.error(`Error al obtener imagen ${filename} para voucher ${id}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al obtener la imagen');
    }
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
