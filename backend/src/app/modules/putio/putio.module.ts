import { forwardRef, Logger, Module, OnModuleInit } from '@nestjs/common';
import { PutioService, PutioSocketWatcherService } from './services';
import { AppConfigService, ConfigurationModule } from '../configuration';
import { DownloadManagerModule } from '../download-manager';
import { createUrl } from '../../helpers';
import { WebhooksController } from './controllers';
import { PutioScheduledWatcherService } from './services/putio-scheduled-watcher.service';
import { PutioOnDemandScannerService } from './services/putio-on-demand-scanner.service';

@Module({
  imports: [forwardRef(() => ConfigurationModule), forwardRef(() => DownloadManagerModule)],
  controllers: [WebhooksController],
  providers: [PutioService, PutioSocketWatcherService, PutioScheduledWatcherService, PutioOnDemandScannerService],
  exports: [PutioService, PutioSocketWatcherService, PutioScheduledWatcherService, PutioOnDemandScannerService],
})
export class PutioModule implements OnModuleInit {
  private readonly logger = new Logger(PutioModule.name);
  constructor(
    private readonly socketService: PutioSocketWatcherService,
    private readonly cronService: PutioScheduledWatcherService,
    private readonly onDemandScannerService: PutioOnDemandScannerService,
    private readonly config: AppConfigService,
  ) {
  }
    async onModuleInit() {
      // Init put.io Socket
      if (!this.config.putioWatcherSocket) {
        this.logger.warn(
          `Monitoring put.io with live websocket is disabled by configuration.`,
        );
      } else {
        this.logger.log(
          `Monitoring put.io with live websocket is enabled by configuration.`,
        );
        await this.socketService.monitorTransfersUsingSocket()
      }

      // Init put.io Webhooks
      if (this.config.putioWebhooksEnabled) {
        const webhookUrl = createUrl({
          host: this.config.host,
          port: this.config.port,
          path: 'putio/webhook',
        });
        this.logger.log(
          `put.io webhooks are enabled, your webhook URL is: ${webhookUrl}`,
        );
      }

      // Init put.io Scheduled Watcher
      if (!this.config.putioCheckCronSchedule) {
        this.logger.log(
          `Disabling scheduled put.io watcher because it's not configured.`,
        );
      } else {
        this.logger.log(
          `Scheduled put.io watcher is enabled: ${this.config.putioCheckCronSchedule}`,
        );
      }
      await this.cronService.configureCronJobs();

      // Scan targets for items on app start-up?
      if (this.config.putioCheckAtStartup) {
        await this.onDemandScannerService.checkTargetsForDownloads();
      }
    }
}
