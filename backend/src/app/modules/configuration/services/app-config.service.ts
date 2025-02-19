import { Injectable, Logger, LogLevel } from '@nestjs/common'
import { ConfigService } from '@nestjs/config';
import fs from 'fs';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import { z, ZodIssue } from 'zod';
import { TargetModel } from '../models';
import * as process from 'process';
import { prettyTime, prettyBytes } from '../../../helpers';
import { getEnvFilePaths } from '../utils/env-paths.util'

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
  DOWNLOADER_ARBITRARY_DOWNLOADS_ENABLED: 'DOWNLOADER_ARBITRARY_DOWNLOADS_ENABLED',
  DOWNLOADER_ARBITRARY_DOWNLOADS_ROOT_FOLDER: 'DOWNLOADER_ARBITRARY_DOWNLOADS_ROOT_FOLDER',
  CONSOLE_LOG_LEVELS: 'CONSOLE_LOG_LEVELS',
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
  downloaderArbitraryDownloadsEnabled: z.boolean().default(false),
  downloaderArbitraryDownloadsRootFolder: z.string().default('/mnt'),
  consoleLogLevels: z.array(z.string()).default(['log', 'warn', 'error']),
}).superRefine((data, ctx) => {
  if (data.downloaderArbitraryDownloadsEnabled) {
    // ensure downloaderArbitraryDownloadsRootFolder exists
    if (!fs.existsSync(data.downloaderArbitraryDownloadsRootFolder)) {
      ctx.addIssue({
        path: ['downloaderArbitraryDownloadsRootFolder'],
        message: `Path does not exist: ${data.downloaderArbitraryDownloadsRootFolder}`,
        fatal: true,
        code: z.ZodIssueCode.custom,
      });
    }
  }
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
  private _watcherTargets?: TargetModel[];
  private _putioWatcherSocket?: boolean;
  private _putioWebhooksEnabled?: boolean;
  private _putioCheckCronSchedule?: string;
  private _putioCheckAtStartup: boolean;
  private _downloaderEnabled?: boolean;
  private _downloaderTargets?: TargetModel[];
  private _downloaderChunkSize: number;
  private _uiProgressUpdateInterval: number;
  private _concurrentGroups: number;
  private _concurrentSmallFiles: number;
  private _concurrentLargeFiles: number;
  private _downloaderPerformanceMonitoringEnabled: boolean;
  private _downloaderPerformanceMonitoringTime: number;
  private _downloaderPerformanceMonitoringSpeed: number;
  private _downloaderArbitraryDownloadsEnabled: boolean;
  private _downloaderArbitraryDownloadsRootFolder: string;
  private _consoleLogLevels: LogLevel[];

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
    this.logger.verbose(`Configuration loaded:`);
    this.logger.verbose('  - Configuration files used:');
    getEnvFilePaths().forEach((source, idx) => {
      this.logger.verbose(`    ${idx}. ${source}`);
    });
    this.logger.verbose(`  - Port: ${this.port}`);
    this.logger.verbose(`  - Host: ${this.host}`);
    this.logger.verbose(`  - Put.io Client ID: ${this.putioClientId}`);
    this.logger.verbose(`  - Put.io Client Secret: ${this.putioClientSecret.slice(-4).padStart(this.putioClientSecret.length, '*')}`);
    this.logger.verbose(`  - Put.io Auth: ${this.putioAuth.slice(-4).padStart(this.putioAuth.length, '*')}`);
    this.logger.verbose(`  - Watcher Enabled: ${this.watcherEnabled}`);
    this.logger.verbose(`  - Watcher Targets: ${this.watcherTargets.map((t) => t.path).join(', ')}`);
    this.logger.verbose(`  - Put.io Watcher Socket: ${this.putioWatcherSocket}`);
    this.logger.verbose(`  - Put.io Webhooks Enabled: ${this.putioWebhooksEnabled}`);
    this.logger.verbose(`  - Put.io Check Cron Schedule: ${this.putioCheckCronSchedule}`);
    this.logger.verbose(`  - Put.io Check At Startup: ${this.putioCheckAtStartup}`);
    this.logger.verbose(`  - Downloader Enabled: ${this.downloaderEnabled}`);
    this.logger.verbose(`  - Downloader Targets: ${this.downloaderTargets.map((t) => t.path).join(', ')}`);
    this.logger.verbose(`  - Downloader Chunk Size: ${prettyBytes(this.downloaderChunkSize)}`);
    this.logger.verbose(`  - UI Progress Update Interval: ${prettyTime(this.uiProgressUpdateInterval)}`);
    this.logger.verbose(`  - Concurrent Groups: ${this.concurrentGroups}`);
    this.logger.verbose(`  - Concurrent Small Files: ${this.concurrentSmallFiles}`);
    this.logger.verbose(`  - Concurrent Large Files: ${this.concurrentLargeFiles}`);
    this.logger.verbose(`  - Downloader Performance Monitoring Enabled: ${this.downloaderPerformanceMonitoringEnabled}`);
    this.logger.verbose(`  - Downloader Performance Monitoring Time: ${prettyTime(this.downloaderPerformanceMonitoringTime)}`);
    this.logger.verbose(`  - Downloader Performance Monitoring Speed: ${prettyBytes(this.downloaderPerformanceMonitoringSpeed)}`);

    // Pretty print the upload targets
    this.logger.verbose(`  - Watcher Targets:`);
    this.watcherTargets.forEach((target) => {
      this.logger.verbose(`    - ${target.path} (${target.targetId})`);
    });

    // Pretty print the download targets
    this.logger.verbose(`  - Downloader Targets:`);
    this.downloaderTargets.forEach((target) => {
      this.logger.verbose(`    - ${target.path} (${target.targetId})`);
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
    this._downloaderArbitraryDownloadsEnabled = this.loadEnvBoolean(EnvKeys.DOWNLOADER_ARBITRARY_DOWNLOADS_ENABLED, false);
    this._downloaderArbitraryDownloadsRootFolder = this.loadEnvString(EnvKeys.DOWNLOADER_ARBITRARY_DOWNLOADS_ROOT_FOLDER, '/mnt');
    this._consoleLogLevels = this.loadEnvArray<LogLevel>(EnvKeys.CONSOLE_LOG_LEVELS, ['log', 'warn', 'error']);

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

  private loadEnvArray<T>(name: string, defaultValue?: T[]): T[] {
    const value = this.configService.get(name);
    return value ? value.split(',').map((v) => v.trim()) : defaultValue;
  }

  private loadEnvBoolean(name: string, defaultValue?: boolean): boolean {
    const value = this.configService.get(name);
    return value ? value === 'true' : defaultValue;

  }

  private loadEnvTargets(name: string): TargetModel[] {
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

  get isDev(): boolean {
    return this.configService.get('NODE_ENV') === 'development';
  }

  get isProd(): boolean {
    return this.configService.get('NODE_ENV') === 'production';
  }

  get isTest(): boolean {
    return this.configService.get('NODE_ENV') === 'test';
  }

  get consoleLogLevels(): LogLevel[] {
    return this._consoleLogLevels;
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

  get watcherTargets(): TargetModel[] {
    return this._watcherTargets;
  }

  set watcherTargets(value: TargetModel[]) {
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

  get downloaderTargets(): TargetModel[] {
    return this._downloaderTargets;
  }

  set downloaderTargets(value: TargetModel[]) {
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

  get downloaderArbitraryDownloadsEnabled(): boolean {
    return this._downloaderArbitraryDownloadsEnabled;
  }

  set downloaderArbitraryDownloadsEnabled(value: boolean) {
    this._downloaderArbitraryDownloadsEnabled = value;
  }

  get downloaderArbitraryDownloadsRootFolder(): string {
    return this._downloaderArbitraryDownloadsRootFolder;
  }

  set downloaderArbitraryDownloadsRootFolder(value: string) {
    this._downloaderArbitraryDownloadsRootFolder = value;
  }
}
