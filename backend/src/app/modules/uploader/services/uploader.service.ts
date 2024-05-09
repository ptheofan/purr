import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import FormData from 'form-data';
import axios, { AxiosError } from 'axios';
import { CreateUploadDto } from '../dtos';
import { Transfer } from '@putdotio/api-client';
import { PutioService } from '../../putio';

const putioUploadEndpoint = 'https://upload.put.io/v2/files/upload';
type PutioError = {
  error_id: null;
  error_message: string;
  error_type: string;
  error_uri: string;
  extra: {
    existing_id: number;
  };
  status: string;
  status_code: number;
}


@Injectable()
export class UploaderService {
  private readonly logger = new Logger(UploaderService.name);

  constructor(
    private readonly putioService: PutioService,
  ) {}

  isAcceptableUploadType(file: string): boolean {
    // noinspection RedundantIfStatementJS
    if (file.endsWith('.torrent') || file.endsWith('.magnet') || file.startsWith('magnet:')) {
      return true;
    }

    return false;
  }

  isPutioError(err: AxiosError): err is AxiosError<PutioError> {
    return (err.response?.data as PutioError)?.error_id !== undefined;
  }

  /**
   * Create an upload to put.io in the specified folder (targetId)
   * @param dto
   */
  async createUpload(dto: CreateUploadDto): Promise<Transfer | null> {
    try {
      const fileStream = fs.createReadStream(dto.file);
      const formData = new FormData();
      const filename = dto.uploadAs || dto.file.split('/').pop();
      formData.append('file', fileStream, filename);
      const r = await axios.post(putioUploadEndpoint, formData, {
        headers: {
          Authorization: `Bearer ${await this.putioService.getAuthToken()}`,
          ...formData.getHeaders(),
        },
        params: {
          parent_id: dto.targetId.toString(),
          filename,
        },
      });

      return r.data.transfer as Transfer;
    } catch (err) {
      const error = err as AxiosError;
      if (error.response.status === 400) {
        const putioError: PutioError = error.response.data as PutioError;
        if (putioError.error_type === 'TRANSFER_ALREADY_ADDED') {
          this.logger.log(`${putioError.error_message} Retrieving transfer ${putioError.extra.existing_id}...`);
          return await this.putioService.getTransfer(putioError.extra.existing_id);
        }

        this.logger.error(`Create Upload Failed (${error.message}) [${putioError.error_message}]`);
      } else if (this.isPutioError(error)) {
        this.logger.error(`Create Upload Failed (${error.message}) [${error.response.data.error_message}]`);
      } else {
        this.logger.error(`Create Upload Failed (${error.message})`);
      }

      throw error;
    }
  }
}
