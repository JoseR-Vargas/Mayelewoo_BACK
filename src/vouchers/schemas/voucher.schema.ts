import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VoucherDocument = Voucher & Document;

@Schema({ 
  timestamps: true,
  collection: 'vouchers'
})
export class Voucher {
  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true })
  apellido: string;

  @Prop({ required: true, index: true })
  dni: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  ref4: string;

  @Prop({ required: true, index: true })
  hab: string;

  @Prop({ required: true, type: Number })
  monto: number;

  @Prop({ type: [String], default: [] })
  fotos: string[];

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ default: 'pendiente' })
  estado: string;

  // Almacenamiento interno de imágenes (en lugar de filesystem)
  @Prop({
    type: [
      {
        filename: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        data: { type: Buffer, required: true },
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    default: []
  })
  imagenes?: Array<{
    filename: string;
    mimeType: string;
    size: number;
    data: Buffer;
    uploadedAt: Date;
  }>;
}

export const VoucherSchema = SchemaFactory.createForClass(Voucher);
