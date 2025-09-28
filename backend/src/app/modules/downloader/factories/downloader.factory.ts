import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
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
    /**
     * Creates a new DownloadCoordinator instance with the provided options.
     * Handles file size detection, range initialization, and manager setup.
     */
    async create<T>(options: DownloaderOptions<T>): Promise<DownloadCoordinator<T>> {
        this.validateOptions(options);

        // Initialize core managers
        const networkManager = new NetworkManager(
            options.networkCheckUrl ?? 'https://1.1.1.1', 
            options.axiosConfig
        );
        const fileManager = new FileManager(options.saveAs);
        const workerManager = new WorkerManager();
        const progressTracker = new ProgressTracker();

        // Determine file size and create ranges
        const fileSize = await this.determineFileSize(options, networkManager);
        const ranges = this.createRanges(options, fileSize);

        // Initialize file with determined size
        await fileManager.initializeFile(fileSize);

        return new DownloadCoordinator(
            options,
            ranges,
            workerManager,
            fileManager,
            networkManager,
            progressTracker
        );
    }

    /**
     * Validates required options for download creation
     */
    private validateOptions<T>(options: DownloaderOptions<T>): void {
        if (!options.url) {
            throw new BadRequestException('URL is required for download');
        }
        if (!options.saveAs) {
            throw new BadRequestException('Save path is required for download');
        }
        if (!options.sourceObject) {
            throw new BadRequestException('Source object is required for download');
        }
    }

    /**
     * Determines the file size from options or network request
     */
    private async determineFileSize<T>(
        options: DownloaderOptions<T>, 
        networkManager: NetworkManager
    ): Promise<number> {
        // Use provided file size if available
        if (options.fileSize) {
            return options.fileSize;
        }

        // Use initial ranges to determine size if available
        if (options.initialRanges) {
            return this.calculateTotalSizeFromRanges(options.initialRanges);
        }

        // Fetch file size from network
        try {
            const size = await networkManager.getFileSize(options.url);
            if (!size || size <= 0) {
                throw new BadRequestException('Invalid file size received from server');
            }
            return size;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException(`Failed to determine file size: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Creates ranges based on options and file size
     */
    private createRanges<T>(options: DownloaderOptions<T>, fileSize: number): Ranges {
        // Use existing ranges if provided (for resume scenarios)
        if (options.initialRanges) {
            // Reset reserved fragments to pending for fresh start
            options.initialRanges.changeAll(FragmentStatus.reserved, FragmentStatus.pending);
            return options.initialRanges;
        }

        // Create new ranges for the file
        return new Ranges(fileSize);
    }

    /**
     * Calculates total file size from ranges
     */
    private calculateTotalSizeFromRanges(ranges: Ranges): number {
        const totalBytes = ranges.count(FragmentStatus.finished) +
            ranges.count(FragmentStatus.pending) +
            ranges.count(FragmentStatus.reserved);
        
        if (totalBytes <= 0) {
            throw new BadRequestException('Invalid ranges: total size is zero or negative');
        }
        
        return totalBytes;
    }
}
