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

  @Prop({ required: true, type: String })
  numeroMedicion: string;

  @Prop({ required: true })
  fechaLectura: Date;

  @Prop({ required: false })
  fotoMedidor?: string;

  // Nuevo almacenamiento binario opcional
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
  fotoMedidorData?: {
    filename: string;
    mimeType: string;
    size: number;
    data: Buffer;
    uploadedAt: Date;
  };

  @Prop({ required: false })
  observaciones?: string;

  @Prop({ default: 'activo' })
  estado: string;
}

export const ContadorSchema = SchemaFactory.createForClass(Contador);
