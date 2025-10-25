import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CalculoMedidorDocument = CalculoMedidor & Document;

@Schema({ 
  timestamps: true,
  collection: 'calculos_medidor'
})
export class CalculoMedidor {
  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true })
  apellido: string;

  @Prop({ required: true, index: true })
  dni: string;

  @Prop({ required: true, index: true })
  habitacion: string;

  @Prop({ required: true, type: Number })
  medicionAnterior: number;

  @Prop({ required: true, type: Number })
  medicionActual: number;

  @Prop({ required: true, type: Number })
  consumoCalculado: number;

  @Prop({ required: true, type: Number })
  montoTotal: number;

  @Prop({ required: true, type: Number })
  precioKWH: number;

  @Prop({ required: true })
  fechaRegistro: Date;

  // Foto de medición anterior
  @Prop({
    type: {
      filename: { type: String },
      mimeType: { type: String },
      size: { type: Number },
      data: { type: Buffer },
      uploadedAt: { type: Date, default: Date.now }
    },
    required: false
  })
  fotoAnteriorData?: {
    filename: string;
    mimeType: string;
    size: number;
    data: Buffer;
    uploadedAt: Date;
  };

  // GridFS file id para foto anterior (si se usa almacenamiento en GridFS)
  @Prop({ type: Types.ObjectId, ref: 'calculosMedidor.files' })
  fotoAnteriorFileId?: Types.ObjectId;

  // Foto de medición actual
  @Prop({
    type: {
      filename: { type: String },
      mimeType: { type: String },
      size: { type: Number },
      data: { type: Buffer },
      uploadedAt: { type: Date, default: Date.now }
    },
    required: false
  })
  fotoActualData?: {
    filename: string;
    mimeType: string;
    size: number;
    data: Buffer;
    uploadedAt: Date;
  };

  // GridFS file id para foto actual (si se usa almacenamiento en GridFS)
  @Prop({ type: Types.ObjectId, ref: 'calculosMedidor.files' })
  fotoActualFileId?: Types.ObjectId;

  @Prop({ type: Number })
  timestamp?: number;
}

export const CalculoMedidorSchema = SchemaFactory.createForClass(CalculoMedidor);

// Índices compuestos para búsquedas eficientes
CalculoMedidorSchema.index({ habitacion: 1, fechaRegistro: -1 });
CalculoMedidorSchema.index({ dni: 1, fechaRegistro: -1 });
