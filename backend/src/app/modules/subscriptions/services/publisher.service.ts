import { DownloadManagerStatsDto, GroupStateChangedDto } from '../dtos';
import { Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { Triggers } from '../enums';
import { RuntimeException } from '@nestjs/core/errors/exceptions';

export class PublisherService {
  constructor(
    @Inject('PUB_SUB') private readonly pubSub: PubSub,
  ) {}

  async groupStateChanged(payload: GroupStateChangedDto): Promise<void> {
    if (!payload) {
      throw new RuntimeException(`The payload cannot be null`);
    }

    return this.pubSub.publish(Triggers.groupStateChanged, { [Triggers.groupStateChanged]: payload });
  }

  async downloadManagerStats(payload: DownloadManagerStatsDto): Promise<void> {
    if (!payload) {
      throw new RuntimeException(`The payload cannot be null`);
    }

    return this.pubSub.publish(Triggers.downloadManagerStats, { [Triggers.downloadManagerStats]: payload });
  }
}
