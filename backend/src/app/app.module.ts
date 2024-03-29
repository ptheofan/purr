import { Module } from '@nestjs/common';
import { DownloadManagerModule, PutioModule, UploaderModule, WatcherService } from './modules';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ConfigurationModule } from './modules/configuration';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';

@Module({
  imports: [
    ConfigurationModule,
    UploaderModule,
    PutioModule,
    DownloadManagerModule,
    ScheduleModule.forRoot(),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      sortSchema: true,
      playground: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      subscriptions: {
        'graphql-ws': true,
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'client'),
      exclude: ['/api(.*)', '/graphql(.*)'],
    }),
  ],
  controllers: [AppController],
  providers: [
    WatcherService,
  ],
})
export class AppModule {}
