import { Module } from '@nestjs/common';
import { PUB_SUB } from '../../helpers';
import { PubSub } from 'graphql-subscriptions';

@Module({
  imports: [],
  controllers: [],
  providers: [
    {
      provide: PUB_SUB,
      useValue: new PubSub(),
    },
  ],
  exports: [PUB_SUB],
})
export class SubscriptionsModule {}
