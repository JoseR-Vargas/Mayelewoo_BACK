import { Controller, Get, Post, Body, ValidationPipe, Param, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', 10, {
    storage: diskStorage({
      destination: './uploads/vouchers',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        return cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB total
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
      fotos: files ? files.map(file => file.filename) : []
    };

    const voucher = await this.vouchersService.create(createVoucherDto);
    return {
      success: true,
      message: 'Voucher registrado exitosamente',
      data: voucher
    };
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
