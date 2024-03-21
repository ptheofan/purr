import { Module } from '@nestjs/common';
import { DownloadManagerModule, PutioModule, UploaderModule, WatcherService } from './modules';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';

@Module({
  imports: [
    UploaderModule,
    PutioModule,
    DownloadManagerModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [WatcherService],
})
export class AppModule {}
