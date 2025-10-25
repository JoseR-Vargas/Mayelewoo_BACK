import { IsString, IsNumber, IsDateString, IsOptional, Min } from 'class-validator';

export class CreateCalculoMedidorDto {
  @IsString({ message: 'Nombre es requerido' })
  nombre: string;

  @IsString({ message: 'Apellido es requerido' })
  apellido: string;

  @IsString({ message: 'DNI es requerido' })
  dni: string;

  @IsString({ message: 'Habitación es requerida' })
  habitacion: string;

  @IsNumber({}, { message: 'Medición anterior debe ser un número' })
  @Min(0, { message: 'Medición anterior debe ser mayor o igual a 0' })
  medicionAnterior: number;

  @IsNumber({}, { message: 'Medición actual debe ser un número' })
  @Min(0, { message: 'Medición actual debe ser mayor o igual a 0' })
  medicionActual: number;

  @IsNumber({}, { message: 'Consumo calculado debe ser un número' })
  @Min(0, { message: 'Consumo calculado debe ser mayor o igual a 0' })
  consumoCalculado: number;

  @IsNumber({}, { message: 'Monto total debe ser un número' })
  @Min(0, { message: 'Monto total debe ser mayor o igual a 0' })
  montoTotal: number;

  @IsNumber({}, { message: 'Precio por kWh debe ser un número' })
  @Min(0, { message: 'Precio por kWh debe ser mayor o igual a 0' })
  precioKWH: number;

  @IsDateString({}, { message: 'Fecha de registro debe ser una fecha válida' })
  fechaRegistro: Date;

  @IsOptional()
  @IsNumber()
  timestamp?: number;
}
