import { Module } from '@nestjs/common';
import { DownloadManagerModule, PutioModule, UploaderModule, WatcherService } from './modules';
import { ScheduleModule } from '@nestjs/schedule';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ConfigurationModule } from './modules/configuration';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { InfoModule } from './modules/info';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigurationModule,
    UploaderModule,
    PutioModule,
    DownloadManagerModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({
      // Enable global event emitter
      global: true,
      // Configure EventEmitter2 options
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      sortSchema: true,
      playground: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      subscriptions: {
        'graphql-ws': true,
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'client'),
      exclude: ['/api(.*)', '/graphql(.*)'],
    }),
    InfoModule,
  ],
  providers: [
    WatcherService,
  ],
})
export class AppModule {}
