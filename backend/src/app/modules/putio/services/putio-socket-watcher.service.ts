import { forwardRef, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PutioService } from './putio.service';
import { createPutioSocketClient, EVENT_TYPE, PutioSocketClient } from '@putdotio/socket-client';
import { AppConfigService } from '../../configuration';
import { DownloadManagerService } from '../../download-manager';
import { TargetModel } from '../../info/models'

@Injectable()
export class PutioSocketWatcherService implements OnModuleInit {
  private readonly logger = new Logger(PutioSocketWatcherService.name);
  private client: PutioSocketClient;

  constructor(
    private readonly putioService: PutioService,
    @Inject(forwardRef(() => DownloadManagerService)) private readonly dmService: DownloadManagerService,
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
      await this.monitorTransfersUsingSocket();
    }
  }

  async monitorTransfersUsingSocket() {
    this.client = createPutioSocketClient({
      token: await this.putioService.getAuthToken(),
    });

    // this.client.on(EVENT_TYPE.CONNECT, () => {
    //   this.logger.log('Connected to put.io socket');
    // });

    // this.client.on(EVENT_TYPE.DISCONNECT, () => {
    //   this.logger.log('Disconnected from put.io socket');
    // });

    // this.client.on(EVENT_TYPE.RECONNECT, () => {
    //   this.logger.log('Reconnected to put.io socket');
    // });

    this.client.on(EVENT_TYPE.ERROR, () => {
      this.logger.error(`Error from put.io socket`);
    });

    this.client.on(EVENT_TYPE.TRANSFER_UPDATE, async (payload) => {
      switch (payload.status) {
        case 'COMPLETED':
          await this.putioFileTransferCompleted(payload.save_parent_id, payload.file_id);
      }
    });
  }

  /**
   * Get the downloader target record that corresponds to the id (if any)
   */
  getTargetById(id: number): TargetModel | null {
    return this.config.downloaderTargets.find((t) => t.targetId === id);
  }

  /**
   * Wait for a file to become available with exponential backoff
   * Files may take some time to appear after transfer completion
   */
  private async waitForFile(itemId: number, maxAttempts = 10): Promise<any> {
    const delays = [1000, 2000, 3000, 5000, 8000, 13000, 21000, 34000, 55000, 89000]; // Fibonacci-like backoff

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const file = await this.putioService.getFile(itemId);
      if (file) {
        if (attempt > 0) {
          this.logger.log(`File ${itemId} became available after ${attempt + 1} attempts`);
        }
        return file;
      }

      if (attempt < maxAttempts - 1) {
        const delay = delays[attempt];
        this.logger.debug(`File ${itemId} not yet available, waiting ${delay}ms before retry ${attempt + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return null;
  }

  /**
   * A transfer was completed at put.io, process it and if it is relevant
   * send it to the download manager
   */
  async putioFileTransferCompleted(parentId: number, itemId: number) {
    const target = this.getTargetById(parentId);
    if (!target) {
      // Nothing of interest
      return;
    }

    // Files may take some time to become available after transfer completion
    const file = await this.waitForFile(itemId);
    if (!file) {
      this.logger.warn(`Transfer completed for file ${itemId}, but file could not be retrieved after multiple attempts`);
      return;
    }
    this.logger.log(`Transfer Completed (put.io) captured via socket - ${file.name}`);
    const vfs = await this.putioService.getVolume(itemId);
    if (!vfs) {
      return;
    }

    if (await this.dmService.groupExists(file.id)) {
      this.logger.log(`Group ${file.id} already exists in Download Manager - ${file.name}`);
      return;
    }
    await this.dmService.addVolume(vfs, target.path);

    if (!await this.dmService.groupExists(file.id)) {
      this.logger.log(`Failed to add group ${file.id} could not be added to the Download Manager - ${file.name}`);
      return;
    }
    await this.dmService.start();
  }
}
