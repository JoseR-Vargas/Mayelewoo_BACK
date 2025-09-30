import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Configurar prefijo global para las rutas API, excluyendo rutas específicas
  app.setGlobalPrefix('api', {
    exclude: ['/uploads/(.*)', '/', '/health']
  });
  
  // Configurar límites de body parser para archivos grandes
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
  
  // Asegurar carpeta uploads en runtime root (soporta dist y ts-node)
  const uploadsPath = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsPath)) {
    mkdirSync(uploadsPath, { recursive: true });
    mkdirSync(join(uploadsPath, 'vouchers'), { recursive: true });
    mkdirSync(join(uploadsPath, 'contadores'), { recursive: true });
  }

  // Configurar archivos estáticos para las imágenes (usar process.cwd para evitar problemas en dist)
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
    setHeaders: (res, path, stat) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
      res.set('Access-Control-Allow-Methods', 'GET');
      res.set('Cache-Control', 'public, max-age=3600');
    }
  });
  
  // Configurar CORS de forma segura para producción
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
  'http://localhost:5500',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000',
  'http://127.0.0.1:5500',
  'https://hostalmayelewoo.netlify.app',
    'https://mayelewoo.github.io',
    process.env.FRONTEND_URL || 'https://mayelewoo.com' // URL del frontend en producción
  ].filter(Boolean);

  app.enableCors({
    origin: process.env.NODE_ENV === 'development' ? true : allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  });

  // Configurar validación global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Aplicación ejecutándose en puerto ${port}`);
}
bootstrap();
