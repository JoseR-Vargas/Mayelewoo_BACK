import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

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

  // Almacenamiento interno de imágenes (DEPRECADO: solo metadata, sin buffer)
  // Los buffers se almacenan en GridFS para reducir el tamaño del documento
  @Prop({
    type: [
      {
        filename: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        data: { type: Buffer },
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    default: []
  })
  imagenes?: Array<{
    filename: string;
    mimeType: string;
    size: number;
    data?: Buffer;
    uploadedAt: Date;
  }>;

  // GridFS file IDs - Almacena las imágenes en GridFS en lugar del documento
  @Prop({ type: [Types.ObjectId], ref: 'vouchers.files', default: [] })
  fotoFileIds?: Types.ObjectId[];
}

export const VoucherSchema = SchemaFactory.createForClass(Voucher);

// Índices compuestos para búsquedas eficientes
VoucherSchema.index({ hab: 1, createdAt: -1 });
VoucherSchema.index({ dni: 1, createdAt: -1 });
VoucherSchema.index({ estado: 1, createdAt: -1 });
