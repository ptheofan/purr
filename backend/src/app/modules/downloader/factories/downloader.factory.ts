import { Injectable } from '@nestjs/common';
import { DownloaderOpts, Downloader } from '../implementation';


@Injectable()
export class DownloaderFactory {
  async create<T>(options: DownloaderOpts<T>): Promise<Downloader<T>> {
    return Downloader.create(options);
  }
}
