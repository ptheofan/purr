import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiService, AppConfigService } from './services';
import { AppConfigResolver } from './resolvers';
import { PutioModule } from '../putio';
import { getEnvFilePaths } from './utils/env-paths.util'

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: getEnvFilePaths(),
    }),
    forwardRef(() => PutioModule),
  ],
  controllers: [],
  providers: [AppConfigService, AppConfigResolver, ApiService],
  exports: [AppConfigService, AppConfigResolver],
})
export class ConfigurationModule {

}
