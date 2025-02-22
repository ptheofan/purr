import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './services';
import { getEnvFilePaths } from './utils/env-paths.util'

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: getEnvFilePaths(),
    }),
  ],
  controllers: [],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class ConfigurationModule {

}
