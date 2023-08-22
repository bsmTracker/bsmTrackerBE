import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { createFolder } from './Utils/multer';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.setBaseViewsDir(path.join(__dirname, '..', 'src', 'views'));
  app.setViewEngine('ejs');
  app.use(cookieParser());
  // app.useWebSocketAdapter(new IoAdapter(app));
  app.enableCors({});

  app.useStaticAssets(path.join(__dirname, 'uploads'), {
    prefix: '/uploads',
  });
  createFolder('audio');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  await app.listen(3000);
}

bootstrap();

export const ROOT_PATH = __dirname;
export const ENV_PATH = path.join(
  ROOT_PATH,
  '/../env/',
  process.env.NODE_ENV + '.env',
);

export function setEnv(key: string, value: string) {
  const envFile = fs.readFileSync(ENV_PATH);
  const envConfig = dotenv.parse(envFile);
  envConfig[key] = value;
  const updatedEnvFile = Object.entries(envConfig)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  fs.writeFileSync(ENV_PATH, updatedEnvFile);
}
