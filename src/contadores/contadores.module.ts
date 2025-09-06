import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContadoresService } from './contadores.service';
import { ContadoresController } from './contadores.controller';
import { Contador, ContadorSchema } from './schemas/contador.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Contador.name, schema: ContadorSchema }])
  ],
  controllers: [ContadoresController],
  providers: [ContadoresService],
  exports: [ContadoresService],
})
export class ContadoresModule {}
