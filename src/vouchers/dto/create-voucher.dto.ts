import { IsString, IsNumber, IsEmail, IsArray, IsOptional, IsDateString } from 'class-validator';

export class CreateVoucherDto {
  @IsString({ message: 'Nombre es requerido' })
  nombre: string;

  @IsString({ message: 'Apellido es requerido' })
  apellido: string;

  @IsString({ message: 'DNI es requerido' })
  dni: string;

  @IsEmail({}, { message: 'Email debe ser válido' })
  email: string;

  @IsString({ message: 'Ref4 es requerido' })
  ref4: string;

  @IsString({ message: 'Habitación es requerida' })
  hab: string;

  @IsNumber({}, { message: 'Monto debe ser un número válido' })
  monto: number;

  @IsOptional()
  @IsArray()
  fotos?: string[];

  @IsDateString({}, { message: 'Timestamp debe ser una fecha válida' })
  timestamp: Date;
}
