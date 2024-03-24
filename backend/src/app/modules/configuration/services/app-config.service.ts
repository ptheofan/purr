import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseInt } from 'lodash';
import fs from 'fs';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import { prettyBytes, prettyTime } from '../../../helpers';
import { z, ZodIssue } from 'zod';
import { Target } from '../models';

export const EnvKeys = {
  PORT: 'PORT',
  HOST: 'HOST',
  PUTIO_CLIENT_ID: 'PUTIO_CLIENT_ID',
  PUTIO_CLIENT_SECRET: 'PUTIO_CLIENT_SECRET',
  PUTIO_AUTH: 'PUTIO_AUTH',
  WATCHER_ENABLED: 'WATCHER_ENABLED',
  WATCHER_TARGETS: 'WATCHER_TARGETS',
  DOWNLOADER_ENABLED: 'DOWNLOADER_ENABLED',
  DOWNLOADER_TARGETS: 'DOWNLOADER_TARGETS',
  DOWNLOADER_CHUNK_SIZE: 'DOWNLOADER_CHUNK_SIZE',
  CONCURRENT_GROUPS: 'CONCURRENT_GROUPS',
  CONCURRENT_SMALL_FILES: 'CONCURRENT_SMALL_FILES',
  CONCURRENT_LARGE_FILES: 'CONCURRENT_LARGE_FILES',
  PUTIO_ENABLE_SOCKET: 'PUTIO_ENABLE_SOCKET',
  PUTIO_ENABLE_WEBHOOKS: 'PUTIO_ENABLE_WEBHOOKS',
  PUTIO_CHECK_CRON_SCHEDULE: 'PUTIO_CHECK_CRON_SCHEDULE',
  PUTIO_CHECK_AT_STARTUP: 'PUTIO_CHECK_AT_STARTUP',
  UI_PROGRESS_UPDATE_INTERVAL: 'UI_PROGRESS_UPDATE_INTERVAL',
  DOWNLOADER_PERFORMANCE_MONITORING_ENABLED: 'DOWNLOADER_PERFORMANCE_MONITORING_ENABLED',
  DOWNLOADER_PERFORMANCE_MONITORING_TIME: 'DOWNLOADER_PERFORMANCE_MONITORING_TIME',
  DOWNLOADER_PERFORMANCE_MONITORING_SPEED: 'DOWNLOADER_PERFORMANCE_MONITORING_SPEED',
}

const configSchema = z.object({
  port: z.number().default(3000),
  host: z.string().default('http://localhost'),
  putioClientId: z.number().int(),
  putioClientSecret: z.string(),
  putioAuth: z.string(),
  watcherEnabled: z.boolean().default(true),
  watcherTargets: z.array(z.object({
    path: z.string(),
    targetId: z.number().int(),
  })),
  downloaderEnabled: z.boolean().default(true),
  downloaderTargets: z.array(z.object({
    path: z.string(),
    targetId: z.number().int(),
  })),
  downloaderChunkSize: z.number().default(1024 * 1024 * 8), // 8MB
  putioWatcherSocket: z.boolean().default(true),
  putioWebhooksEnabled: z.boolean().default(false),
  putioCheckCronSchedule: z.string().optional(),
  putioCheckAtStartup: z.boolean().default(true),
  uiProgressUpdateInterval: z.number().default(333),
  concurrentGroups: z.number().default(2),
  concurrentSmallFiles: z.number().default(8),
  concurrentLargeFiles: z.number().default(2),
  downloaderPerformanceMonitoringEnabled: z.boolean().default(true),
  downloaderPerformanceMonitoringTime: z.number().default(10),
  downloaderPerformanceMonitoringSpeed: z.number().default(0),
});

@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);

  private _port: number;
  private _host: string;
  private _putioAuth?: string;
  private _putioClientId?: number;
  private _putioClientSecret?: string;
  private _watcherEnabled?: boolean;
  private _watcherTargets?: Target[];
  private _putioWatcherSocket?: boolean;
  private _putioWebhooksEnabled?: boolean;
  private _putioCheckCronSchedule?: string;
  private _putioCheckAtStartup: boolean;
  private _downloaderEnabled?: boolean;
  private _downloaderTargets?: Target[];
  private _downloaderChunkSize: number;
  private _uiProgressUpdateInterval: number;
  private _concurrentGroups: number;
  private _concurrentSmallFiles: number;
  private _concurrentLargeFiles: number;
  private _downloaderPerformanceMonitoringEnabled: boolean;
  private _downloaderPerformanceMonitoringTime: number;
  private _downloaderPerformanceMonitoringSpeed: number;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.loadEnvConfig();
    const validation = configSchema.safeParse(this);
    if (validation.success === false) {
      const errors: ZodIssue[] = validation.error.issues;
      this.logger.warn(`Please fix the following errors:`);
      errors.forEach((error) => {
        this.logger.error(`  - ${error.path.join('.')} ${error.message}`);
      });
      // FATAL ERROR, exit here.
      process.exit(5);
    }

    // Pretty print the configuration
    this.logger.log(`Configuration loaded:`);
    this.logger.log(`  - Port: ${this.port}`);
    this.logger.log(`  - Host: ${this.host}`);
    this.logger.log(`  - Put.io Client ID: ${this.putioClientId}`);
    this.logger.log(`  - Put.io Client Secret: ${this.putioClientSecret.slice(-4).padStart(this.putioClientSecret.length, '*')}`);
    this.logger.log(`  - Put.io Auth: ${this.putioAuth.slice(-4).padStart(this.putioAuth.length, '*')}`);
    this.logger.log(`  - Watcher Enabled: ${this.watcherEnabled}`);
    this.logger.log(`  - Watcher Targets: ${this.watcherTargets.map((t) => t.path).join(', ')}`);
    this.logger.log(`  - Put.io Watcher Socket: ${this.putioWatcherSocket}`);
    this.logger.log(`  - Put.io Webhooks Enabled: ${this.putioWebhooksEnabled}`);
    this.logger.log(`  - Put.io Check Cron Schedule: ${this.putioCheckCronSchedule}`);
    this.logger.log(`  - Put.io Check At Startup: ${this.putioCheckAtStartup}`);
    this.logger.log(`  - Downloader Enabled: ${this.downloaderEnabled}`);
    this.logger.log(`  - Downloader Targets: ${this.downloaderTargets.map((t) => t.path).join(', ')}`);
    this.logger.log(`  - Downloader Chunk Size: ${prettyBytes(this.downloaderChunkSize)}`);
    this.logger.log(`  - UI Progress Update Interval: ${prettyTime(this.uiProgressUpdateInterval)}`);
    this.logger.log(`  - Concurrent Groups: ${this.concurrentGroups}`);
    this.logger.log(`  - Concurrent Small Files: ${this.concurrentSmallFiles}`);
    this.logger.log(`  - Concurrent Large Files: ${this.concurrentLargeFiles}`);
    this.logger.log(`  - Downloader Performance Monitoring Enabled: ${this.downloaderPerformanceMonitoringEnabled}`);
    this.logger.log(`  - Downloader Performance Monitoring Time: ${prettyTime(this.downloaderPerformanceMonitoringTime)}`);
    this.logger.log(`  - Downloader Performance Monitoring Speed: ${prettyBytes(this.downloaderPerformanceMonitoringSpeed)}`);

    // Pretty print the upload targets
    this.logger.log(`  - Watcher Targets:`);
    this.watcherTargets.forEach((target) => {
      this.logger.log(`    - ${target.path} (${target.targetId})`);
    });

    // Pretty print the download targets
    this.logger.log(`  - Downloader Targets:`);
    this.downloaderTargets.forEach((target) => {
      this.logger.log(`    - ${target.path} (${target.targetId})`);
    });
  }

  private loadEnvConfig() {
    this._port = this.loadEnvInt(EnvKeys.PORT, 3000);
    this._host = this.loadEnvString(EnvKeys.HOST, 'http://localhost');
    this._putioAuth = this.loadEnvString(EnvKeys.PUTIO_AUTH);
    this._putioClientId = this.loadEnvInt(EnvKeys.PUTIO_CLIENT_ID);
    this._putioClientSecret = this.loadEnvString(EnvKeys.PUTIO_CLIENT_SECRET);
    this._watcherEnabled = this.loadEnvBoolean(EnvKeys.WATCHER_ENABLED, true);
    this._watcherTargets = this.loadEnvTargets(EnvKeys.WATCHER_TARGETS);
    this._downloaderEnabled = this.loadEnvBoolean(EnvKeys.DOWNLOADER_ENABLED, true);
    this._downloaderTargets = this.loadEnvTargets(EnvKeys.DOWNLOADER_TARGETS);
    this._downloaderChunkSize = this.loadEnvInt(EnvKeys.DOWNLOADER_CHUNK_SIZE, 1024 * 1024 * 8);
    this._putioWatcherSocket = this.loadEnvBoolean(EnvKeys.PUTIO_ENABLE_SOCKET, true);
    this._putioWebhooksEnabled = this.loadEnvBoolean(EnvKeys.PUTIO_ENABLE_WEBHOOKS, false);
    this._putioCheckCronSchedule = this.loadEnvString(EnvKeys.PUTIO_CHECK_CRON_SCHEDULE, '*/60 * * * * *');
    if (this._putioCheckCronSchedule.toLowerCase().trim() === 'false') {
      this._putioCheckCronSchedule = undefined;
    }
    this._putioCheckAtStartup = this.loadEnvBoolean(EnvKeys.PUTIO_CHECK_AT_STARTUP, true);
    this._uiProgressUpdateInterval = this.loadEnvInt(EnvKeys.UI_PROGRESS_UPDATE_INTERVAL, 333);
    this._concurrentGroups = this.loadEnvInt(EnvKeys.CONCURRENT_GROUPS, 2);
    this._concurrentSmallFiles = this.loadEnvInt(EnvKeys.CONCURRENT_SMALL_FILES, 8);
    this._concurrentLargeFiles = this.loadEnvInt(EnvKeys.CONCURRENT_LARGE_FILES, 2);
    this._downloaderPerformanceMonitoringEnabled = this.loadEnvBoolean(EnvKeys.DOWNLOADER_PERFORMANCE_MONITORING_ENABLED, true);
    this._downloaderPerformanceMonitoringTime = this.loadEnvInt(EnvKeys.DOWNLOADER_PERFORMANCE_MONITORING_TIME, 10);
    this._downloaderPerformanceMonitoringSpeed = this.loadEnvInt(EnvKeys.DOWNLOADER_PERFORMANCE_MONITORING_SPEED, 0);
    if (this._downloaderPerformanceMonitoringSpeed === 0) {
      this._downloaderPerformanceMonitoringSpeed = Math.floor(this._downloaderChunkSize * 0.8);
    }

    // Validate Targets
    this._watcherTargets.forEach((target) => {
      if (!fs.existsSync(target.path)) {
        throw new RuntimeException(`Watcher target path does not exist: ${target.path}`);
      }
    });
    this._downloaderTargets.forEach((target) => {
      if (!fs.existsSync(target.path)) {
        throw new RuntimeException(`Downloader target path does not exist: ${target.path}`);
      }
    });
  }

  private loadEnvInt(name: string, defaultValue?: number): number {
    const value = this.configService.get(name);
    return value ? parseInt(value, 10) : defaultValue;
  }

  private loadEnvString(name: string, defaultValue?: string): string {
    return this.configService.get(name) || defaultValue;
  }

  private loadEnvBoolean(name: string, defaultValue?: boolean): boolean {
    const value = this.configService.get(name);
    return value ? value === 'true' : defaultValue;

  }

  private loadEnvTargets(name: string): Target[] {
    const value = this.configService.get(name);
    if (!value) {
      return [];
    }

    const datasets = value.split(';');
    const rVal = [];
    for (let i = 0; i < datasets.length; i++) {
      const [path, targetId] = datasets[i].split(':');
      rVal.push({ targetId: parseInt(targetId, 10), path });
    }

    return rVal;
  }

  get port(): number {
    return this._port;
  }

  set port(value: number) {
    this._port = value;
  }

  get host(): string {
    return this._host;
  }

  set host(value: string) {
    this._host = value;
  }

  get putioAuth(): string {
    return this._putioAuth;
  }

  set putioAuth(value: string) {
    this._putioAuth = value;
  }

  get putioClientId(): number {
    return this._putioClientId;
  }

  set putioClientId(value: number) {
    this._putioClientId = value;
  }

  get putioClientSecret(): string {
    return this._putioClientSecret;
  }

  set putioClientSecret(value: string) {
    this._putioClientSecret = value;
  }

  get watcherEnabled(): boolean {
    return this._watcherEnabled;
  }

  set watcherEnabled(value: boolean) {
    this._watcherEnabled = value;
  }

  get watcherTargets(): Target[] {
    return this._watcherTargets;
  }

  set watcherTargets(value: Target[]) {
    this._watcherTargets = value;
  }

  get putioWatcherSocket(): boolean {
    return this._putioWatcherSocket;
  }

  set putioWatcherSocket(value: boolean) {
    this._putioWatcherSocket = value;
  }

  get putioWebhooksEnabled(): boolean {
    return this._putioWebhooksEnabled;
  }

  set putioWebhooksEnabled(value: boolean) {
    this._putioWebhooksEnabled = value;
  }

  get putioCheckCronSchedule(): string | undefined {
    return this._putioCheckCronSchedule;
  }

  set putioCheckCronSchedule(value: string | undefined) {
    this._putioCheckCronSchedule = value;
  }

  get putioCheckAtStartup(): boolean {
    return this._putioCheckAtStartup;
  }

  set putioCheckAtStartup(value: boolean) {
    this._putioCheckAtStartup = value;
  }

  get downloaderEnabled(): boolean {
    return this._downloaderEnabled;
  }

  set downloaderEnabled(value: boolean) {
    this._downloaderEnabled = value;
  }

  get downloaderTargets(): Target[] {
    return this._downloaderTargets;
  }

  set downloaderTargets(value: Target[]) {
    this._downloaderTargets = value;
  }

  get downloaderChunkSize(): number {
    return this._downloaderChunkSize;
  }

  set downloaderChunkSize(value: number) {
    this._downloaderChunkSize = value;
  }

  get uiProgressUpdateInterval(): number {
    return this._uiProgressUpdateInterval;
  }

  set uiProgressUpdateInterval(value: number) {
    this._uiProgressUpdateInterval = value;
  }

  get concurrentGroups(): number {
    return this._concurrentGroups;
  }

  set concurrentGroups(value: number) {
    this._concurrentGroups = value;
  }

  get concurrentSmallFiles(): number {
    return this._concurrentSmallFiles;
  }

  set concurrentSmallFiles(value: number) {
    this._concurrentSmallFiles = value;
  }

  get concurrentLargeFiles(): number {
    return this._concurrentLargeFiles;
  }

  set concurrentLargeFiles(value: number) {
    this._concurrentLargeFiles = value;
  }

  get downloaderPerformanceMonitoringEnabled(): boolean {
    return this._downloaderPerformanceMonitoringEnabled;
  }

  set downloaderPerformanceMonitoringEnabled(value: boolean) {
    this._downloaderPerformanceMonitoringEnabled = value;
  }

  get downloaderPerformanceMonitoringTime(): number {
    return this._downloaderPerformanceMonitoringTime;
  }

  set downloaderPerformanceMonitoringTime(value: number) {
    this._downloaderPerformanceMonitoringTime = value;
  }

  get downloaderPerformanceMonitoringSpeed(): number {
    return this._downloaderPerformanceMonitoringSpeed;
  }

  set downloaderPerformanceMonitoringSpeed(value: number) {
    this._downloaderPerformanceMonitoringSpeed = value;
  }
}
