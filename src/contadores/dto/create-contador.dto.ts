import { IsString, IsNumber, IsDateString, IsOptional } from 'class-validator';

export class CreateContadorDto {
  @IsString({ message: 'DNI es requerido' })
  dni: string;

  @IsString({ message: 'Nombre es requerido' })
  nombre: string;

  @IsString({ message: 'Apellidos es requerido' })
  apellidos: string;

  @IsString({ message: 'Habitación es requerida' })
  habitacion: string;

  @IsString({ message: 'Número de medidor es requerido' })
  numeroMedidor: string;

  @IsNumber({}, { message: 'Lectura actual debe ser un número válido' })
  lecturaActual: number;

  @IsNumber({}, { message: 'Lectura anterior debe ser un número válido' })
  lecturaAnterior: number;

  @IsDateString({}, { message: 'Fecha de lectura debe ser una fecha válida' })
  fechaLectura: Date;

  @IsOptional()
  @IsString()
  fotoMedidor?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
