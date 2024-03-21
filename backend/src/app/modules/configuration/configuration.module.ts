import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './app-config.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
  ],
  controllers: [],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class ConfigurationModule {

}
