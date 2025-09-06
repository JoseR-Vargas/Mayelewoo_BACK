import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ContadorDocument = Contador & Document;

@Schema({ 
  timestamps: true,
  collection: 'contadores'
})
export class Contador {
  @Prop({ required: true, index: true })
  dni: string;

  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true })
  apellidos: string;

  @Prop({ required: true, index: true })
  habitacion: string;

  @Prop({ required: true })
  numeroMedidor: string;

  @Prop({ required: true, type: Number })
  lecturaActual: number;

  @Prop({ required: true, type: Number })
  lecturaAnterior: number;

  @Prop({ required: true })
  fechaLectura: Date;

  @Prop({ required: false })
  fotoMedidor?: string;

  @Prop({ required: false })
  observaciones?: string;

  @Prop({ type: Number, default: 0 })
  consumo: number;

  @Prop({ default: 'activo' })
  estado: string;
}

export const ContadorSchema = SchemaFactory.createForClass(Contador);
