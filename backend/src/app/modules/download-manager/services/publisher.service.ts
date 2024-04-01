
import { Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PubKeys } from '../enums';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import { DownloadManagerStatsDto, GroupDto, GroupStateChangedDto } from '../dtos';

export class PublisherService {
  constructor(
    @Inject('PUB_SUB') private readonly pubSub: PubSub,
  ) {}

  async groupStateChanged(payload: GroupStateChangedDto): Promise<void> {
    if (!payload) {
      throw new RuntimeException(`The payload cannot be null`);
    }

    return this.pubSub.publish(PubKeys.groupStateChanged, { [PubKeys.groupStateChanged]: payload });
  }

  async groupAdded(payload: GroupDto): Promise<void> {
    if (!payload) {
      throw new RuntimeException(`The payload cannot be null`);
    }

    return this.pubSub.publish(PubKeys.groupAdded, { [PubKeys.groupAdded]: payload });
  }

  async downloadManagerStats(payload: DownloadManagerStatsDto): Promise<void> {
    if (!payload) {
      throw new RuntimeException(`The payload cannot be null`);
    }

    return this.pubSub.publish(PubKeys.downloadManagerStats, { [PubKeys.downloadManagerStats]: payload });
  }
}
