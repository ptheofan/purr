import { Module } from '@nestjs/common';
import { PUB_SUB } from '../../helpers';
import { PubSub } from 'graphql-subscriptions';
import { PublisherService } from './services';

@Module({
  imports: [],
  controllers: [],
  providers: [
    {
      provide: PUB_SUB,
      useValue: new PubSub(),
    },
    PublisherService,
  ],
  exports: [PublisherService, PUB_SUB],
})
export class SubscriptionsModule {}
