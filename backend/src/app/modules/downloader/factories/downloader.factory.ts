import { Injectable } from '@nestjs/common';
import { DownloaderOptions } from '../implementation';
import { DownloadCoordinator } from '../implementation';
import { NetworkManager } from '../implementation/network-manager';
import { FileManager } from '../implementation/file-manager';
import { WorkerManager } from '../implementation/worker-manager';
import { ProgressTracker } from '../implementation/progress-tracker';
import { Ranges } from '../implementation';
import { FragmentStatus } from '../dtos';

@Injectable()
export class DownloadFactory {
    async create<T>(options: DownloaderOptions<T>): Promise<DownloadCoordinator<T>> {
        // Initialize managers
        const networkManager = new NetworkManager(options.networkCheckUrl ?? 'https://1.1.1.1', options.axiosConfig);
        const fileManager = new FileManager(options.saveAs);
        const workerManager = new WorkerManager();
        const progressTracker = new ProgressTracker();

        // Get file size and initialize ranges
        if (!options.fileSize && !options.initialRanges) {
            const size = await networkManager.getFileSize(options.url);
            if (!size) {
                throw new Error('Cannot start download: file size is unknown');
            }
            await fileManager.initializeFile(size);
            return new DownloadCoordinator(
              options,
              new Ranges(size),
              workerManager,
              fileManager,
              networkManager,
              progressTracker
            );
        }

        if (options.initialRanges) {
            options.initialRanges.changeAll(FragmentStatus.reserved, FragmentStatus.pending);
            return new DownloadCoordinator(
              options,
              options.initialRanges,
              workerManager,
              fileManager,
              networkManager,
              progressTracker
            );
        }

        await fileManager.initializeFile(options.fileSize!);
        return new DownloadCoordinator(
          options,
          new Ranges(options.fileSize!),
          workerManager,
          fileManager,
          networkManager,
          progressTracker
        );
    }
}
