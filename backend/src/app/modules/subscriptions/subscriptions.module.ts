import { Module } from '@nestjs/common';
import { PUB_SUB } from '../../helpers';
import { PubSub } from 'graphql-subscriptions';
import { TriggerService } from './services';

@Module({
  imports: [],
  controllers: [],
  providers: [
    {
      provide: PUB_SUB,
      useValue: new PubSub(),
    },
    TriggerService,
  ],
  exports: [TriggerService, PUB_SUB],
})
export class SubscriptionsModule {}
