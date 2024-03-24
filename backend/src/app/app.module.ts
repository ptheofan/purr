import { Module } from '@nestjs/common';
import { DownloadManagerModule, PutioModule, UploaderModule, WatcherService } from './modules';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ConfigurationModule } from './modules/configuration';


@Module({
  imports: [
    ConfigurationModule,
    UploaderModule,
    PutioModule,
    DownloadManagerModule,
    ScheduleModule.forRoot(),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      playground: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
      subscriptions: {
        'graphql-ws': true,
      },
    }),
  ],
  controllers: [AppController],
  providers: [
    WatcherService,
  ],
})
export class AppModule {}
