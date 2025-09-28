import { Inject, Injectable } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PubKeys } from '../enums';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import {
  DownloadManagerStatsDto,
  GroupDto,
  GroupStateChangedDto,
  GroupStatusChangedDto,
  ItemStatsDto,
  ItemStatusChangedDto
} from '../dtos';

/**
 * Service responsible for publishing GraphQL subscription events
 * for download manager state changes
 */
@Injectable()
export class PublisherService {
  constructor(
    @Inject('PUB_SUB') private readonly pubSub: PubSub,
  ) {}

  /**
   * Publishes group state change events
   */
  async groupStateChanged(payload: GroupStateChangedDto): Promise<void> {
    if (!payload) {
      throw new RuntimeException('The payload cannot be null');
    }
    return this.pubSub.publish(PubKeys.groupStateChanged, { [PubKeys.groupStateChanged]: payload });
  }

  /**
   * Publishes group status change events
   */
  async groupStatusChanged(payload: GroupStatusChangedDto): Promise<void> {
    if (!payload) {
      throw new RuntimeException('The payload cannot be null');
    }
    return this.pubSub.publish(PubKeys.groupStatusChanged, { [PubKeys.groupStatusChanged]: payload });
  }

  /**
   * Publishes group added events
   */
  async groupAdded(payload: GroupDto): Promise<void> {
    if (!payload) {
      throw new RuntimeException('The payload cannot be null');
    }
    return this.pubSub.publish(PubKeys.groupAdded, { [PubKeys.groupAdded]: payload });
  }

  /**
   * Publishes item status change events
   */
  async itemStatusChanged(payload: ItemStatusChangedDto): Promise<void> {
    if (!payload) {
      throw new RuntimeException('The payload cannot be null');
    }
    return this.pubSub.publish(PubKeys.itemStatusChanged, { [PubKeys.itemStatusChanged]: payload });
  }

  /**
   * Publishes item stats update events
   */
  async itemStatsUpdated(payload: ItemStatsDto): Promise<void> {
    if (!payload) {
      throw new RuntimeException('The payload cannot be null');
    }
    return this.pubSub.publish(PubKeys.itemStatsUpdated, { [PubKeys.itemStatsUpdated]: payload });
  }

  /**
   * Publishes download manager stats events
   */
  async downloadManagerStats(payload: DownloadManagerStatsDto): Promise<void> {
    if (!payload) {
      throw new RuntimeException('The payload cannot be null');
    }
    return this.pubSub.publish(PubKeys.downloadManagerStats, { [PubKeys.downloadManagerStats]: payload });
  }
}
