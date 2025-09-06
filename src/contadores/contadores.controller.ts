import { Controller, Get, Post, Body, ValidationPipe, Param, Query } from '@nestjs/common';
import { ContadoresService } from './contadores.service';
import { CreateContadorDto } from './dto/create-contador.dto';

@Controller('api/contadores')
export class ContadoresController {
  constructor(private readonly contadoresService: ContadoresService) {}

  @Post()
  async create(@Body(ValidationPipe) createContadorDto: CreateContadorDto) {
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
