import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './services';
import { AppConfigResolver } from './resolvers';

@Module({
  imports: [
    ConfigModule.forRoot(),
  ],
  controllers: [],
  providers: [AppConfigService, AppConfigResolver],
  exports: [AppConfigService, AppConfigResolver],
})
export class ConfigurationModule {

}
