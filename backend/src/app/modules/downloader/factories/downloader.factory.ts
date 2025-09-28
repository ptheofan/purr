import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
    private readonly logger = new Logger(DownloadFactory.name);
    private readonly activeDownloaders = new Map<string, DownloadCoordinator<any>>();

    constructor(
        private readonly eventEmitter: EventEmitter2
    ) {
        this.logger.log('DownloadFactory initialized');
    }

    /**
     * Creates a new DownloadCoordinator instance with the provided options.
     * Handles file size detection, range initialization, and manager setup.
     */
    async create<T>(options: DownloaderOptions<T>): Promise<DownloadCoordinator<T>> {
        this.validateOptions(options);

        // Create fresh instances for this download (maintains isolation)
        const networkManager = new NetworkManager();
        const fileManager = new FileManager();
        const workerManager = new WorkerManager();
        const progressTracker = new ProgressTracker();
        const coordinator = new DownloadCoordinator<T>(
            workerManager,
            fileManager,
            networkManager,
            progressTracker
        );

        // Configure the instances
        networkManager.configure(
            options.networkCheckUrl ?? 'https://1.1.1.1',
            options.axiosConfig
        );
        fileManager.configure(options.saveAs);

        // Determine file size and create ranges
        const fileSize = await this.determineFileSize(options, networkManager);
        const ranges = this.createRanges(options, fileSize);

        // Initialize file with determined size
        await fileManager.initializeFile(fileSize);

        // Configure the coordinator and inject the global event emitter
        coordinator.configure(options, ranges);

        // Set up global event forwarding if needed
        if (this.eventEmitter) {
            this.setupEventForwarding(coordinator);
        }

        // Track active downloaders for monitoring
        this.activeDownloaders.set(coordinator.id, coordinator);

        // Listen to completion/error events to clean up tracking
        coordinator.once('download.completed', () => {
            this.activeDownloaders.delete(coordinator.id);
            this.logger.debug(`Downloader ${coordinator.id} completed and removed from tracking`);
        });

        coordinator.once('download.error', () => {
            this.activeDownloaders.delete(coordinator.id);
            this.logger.debug(`Downloader ${coordinator.id} errored and removed from tracking`);
        });

        this.logger.log(`Created downloader ${coordinator.id} for ${options.url}`);
        return coordinator;
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

    /**
     * Get all active downloaders
     */
    getActiveDownloaders(): ReadonlyMap<string, DownloadCoordinator<any>> {
        return this.activeDownloaders;
    }

    /**
     * Get downloader by ID
     */
    getDownloader(id: string): DownloadCoordinator<any> | undefined {
        return this.activeDownloaders.get(id);
    }

    /**
     * Dispose all active downloaders and clean up
     */
    async disposeAll(): Promise<void> {
        this.logger.log(`Disposing ${this.activeDownloaders.size} active downloaders`);

        const disposePromises = Array.from(this.activeDownloaders.values()).map(async (coordinator) => {
            try {
                await coordinator.dispose();
            } catch (error) {
                this.logger.error(`Failed to dispose downloader ${coordinator.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });

        await Promise.allSettled(disposePromises);
        this.activeDownloaders.clear();
        this.logger.log('All downloaders disposed');
    }

    /**
     * Get factory statistics
     */
    getStats() {
        return {
            activeDownloaders: this.activeDownloaders.size,
            downloaderIds: Array.from(this.activeDownloaders.keys())
        };
    }

    /**
     * Set up event forwarding from coordinator to global event emitter
     */
    private setupEventForwarding(coordinator: DownloadCoordinator<any>): void {
        // Forward all coordinator events to global emitter with instance scoping
        coordinator.onAny((event: string, ...args: any[]) => {
            // Emit with instance scope
            this.eventEmitter.emit(`${event}.${coordinator.id}`, ...args);
            // Also emit without scope for global listeners
            this.eventEmitter.emit(event, ...args);
        });
    }
}
