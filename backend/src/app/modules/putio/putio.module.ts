import { forwardRef, Module } from '@nestjs/common';
import {
  PutioOnDemandScannerService,
  PutioScheduledWatcherService,
  PutioService,
  PutioSocketWatcherService
} from './services';
import { ConfigurationModule } from '../configuration';
import { DownloadManagerModule } from '../download-manager';
import { WebhooksController } from './controllers';

@Module({
  imports: [
    forwardRef(() => ConfigurationModule),
    forwardRef(() => DownloadManagerModule)
  ],
  controllers: [WebhooksController],
  providers: [PutioService, PutioSocketWatcherService, PutioScheduledWatcherService, PutioOnDemandScannerService,],
  exports: [PutioService, PutioSocketWatcherService, PutioScheduledWatcherService, PutioOnDemandScannerService],
})
export class PutioModule {
}
