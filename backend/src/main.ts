import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';
import { AppConfigService } from './app/modules/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigService);
  await app.listen(config.port);
  Logger.log(`🚀 Purrito is running on: ${config.host}:${config.port}/`);
}

bootstrap();
