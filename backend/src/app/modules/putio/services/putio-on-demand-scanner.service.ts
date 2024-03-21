import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { PutioService } from './putio.service';
import { AppConfigService } from '../../configuration';
import { DownloadManagerService } from '../../download-manager/services';

@Injectable()
export class PutioOnDemandScannerService {
  private readonly logger = new Logger(PutioOnDemandScannerService.name);

  constructor(
    private readonly putioService: PutioService,
    private readonly config: AppConfigService,
    @Inject(forwardRef(() => DownloadManagerService)) private readonly dmService: DownloadManagerService,
  ) {}


  /**
   * Scans put.io targets for downloads
   * Will return the ids of the files that were added to the Download Manager
   */
  async checkTargetsForDownloads(): Promise<number[]> {
    this.logger.log('Scanning put.io targets for downloads...');
    const api = await this.putioService.getApi();
    const rVal = [];
    for (const target of this.config.downloaderTargets) {
      const filesResponse = await this.putioService.rateLimitSafeCall(async () => api.Files.Query(target.targetId));
      for (const file of filesResponse.files) {
        if (await this.dmService.groupExists(file.id)) {
          this.logger.log(`${file.name} already exists in Download Manager (${file.id})`);
          continue;
        }

        this.logger.log(`Adding to Download Manager - ${file.name}`);
        const vfs = await this.putioService.getVolume(file.id);
        if (!vfs) {
          return;
        }

        rVal.push(file.id);
        await this.dmService.addVolume(vfs, target.path);
        if (!await this.dmService.groupExists(file.id)) {
          this.logger.log(`Failed to add group ${file.id} could not be added to the Download Manager - ${file.name}`);
          return;
        }
      }
    }

    if (rVal.length > 0) {
      await this.dmService.start();
    }

    return rVal;
  }
}
