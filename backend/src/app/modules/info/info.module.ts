import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration';
import { ApiService } from './services';
import { AppConfigResolver} from './resolvers';
import { PutioModule } from '../putio'

@Module({
  imports: [
    ConfigurationModule,
    PutioModule,
  ],
  providers: [
    ApiService,
    AppConfigResolver,
  ],
  exports: [
    ApiService,
  ]
})
export class InfoModule {}
