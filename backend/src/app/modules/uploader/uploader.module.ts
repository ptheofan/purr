import { Module, OnModuleInit } from '@nestjs/common';
import { PutioModule } from '../putio';
import { UploaderService, WatcherService } from './services';
import { AppConfigService, ConfigurationModule } from '../configuration';

@Module({
  imports: [PutioModule, ConfigurationModule],
  controllers: [],
  providers: [UploaderService, WatcherService],
  exports: [UploaderService, WatcherService],
})
export class UploaderModule implements OnModuleInit {
  constructor(
    private readonly config: AppConfigService,
    private readonly watcherService: WatcherService,
  ) {
  }

  async onModuleInit() {
    if (!this.config.watcherEnabled) {
      return;
    }

    for (const target of this.config.watcherTargets) {
      await this.watcherService.monitorFolder(target);
    }
  }
}
