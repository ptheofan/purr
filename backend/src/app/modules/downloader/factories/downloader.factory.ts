import {Injectable} from '@nestjs/common';
import {DownloaderOptions, Downloader} from '../implementation';


@Injectable()
export class DownloaderFactory {
    async create<T>(options: DownloaderOptions<T>): Promise<Downloader<T>> {
        return new Downloader<T>(options);
    }
}
