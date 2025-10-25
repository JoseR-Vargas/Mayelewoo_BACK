import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CalculosMedidorController } from './calculos-medidor.controller';
import { CalculosMedidorService } from './calculos-medidor.service';
import { CalculoMedidor, CalculoMedidorSchema } from './schemas/calculo-medidor.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CalculoMedidor.name, schema: CalculoMedidorSchema }
    ])
  ],
  controllers: [CalculosMedidorController],
  providers: [CalculosMedidorService],
  exports: [CalculosMedidorService]
})
export class CalculosMedidorModule {}
