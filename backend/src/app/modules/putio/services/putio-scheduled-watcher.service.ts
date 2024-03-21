import { Injectable, Logger } from '@nestjs/common';
import { CronJob, CronTime } from 'cron';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AppConfigService } from '../../configuration';
import { PutioOnDemandScannerService } from './putio-on-demand-scanner.service';

@Injectable()
export class PutioScheduledWatcherService {
  private readonly logger = new Logger(PutioScheduledWatcherService.name);
  private job: CronJob;

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly putioOnDemandScannerService: PutioOnDemandScannerService,
    private readonly config: AppConfigService,
  ) {}


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
