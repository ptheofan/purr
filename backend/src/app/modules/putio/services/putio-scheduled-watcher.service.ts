import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CronJob, CronTime } from 'cron';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AppConfigService } from '../../configuration';
import { PutioOnDemandScannerService } from './putio-on-demand-scanner.service';

@Injectable()
export class PutioScheduledWatcherService implements OnModuleInit {
  private readonly logger = new Logger(PutioScheduledWatcherService.name);
  private job: CronJob;

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly putioOnDemandScannerService: PutioOnDemandScannerService,
    private readonly config: AppConfigService,
  ) {}

  async onModuleInit() {
    // Init put.io Scheduled Watcher
    if (!this.config.putioCheckCronSchedule) {
      this.logger.log(
        `Disabling scheduled put.io watcher because it's not configured.`,
      );
    } else {
      this.logger.log(
        `Scheduled put.io watcher is enabled: ${ this.config.putioCheckCronSchedule }`,
      );
    }
    await this.configureCronJobs();
  }


  async configureCronJobs() {
    if (!this.config.putioCheckCronSchedule) {
      this.job && this.job.stop();
      return;
    }

    if (this.job) {
      this.job.setTime(new CronTime(this.config.putioCheckCronSchedule));
      return;
    }

    this.job = new CronJob(this.config.putioCheckCronSchedule, async () => {
      await this.checkTargetsForDownloads();
    });
    this.job.start();
  }

  async checkTargetsForDownloads() {
    this.logger.log('Scheduled put.io downloads checker is now starting...');
    await this.putioOnDemandScannerService.checkTargetsForDownloads();
    this.logger.log('Scheduled put.io downloads checker finished!');
  }
}
