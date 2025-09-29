import { Injectable, Logger, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fs from 'fs';
import { z } from 'zod';
import { TargetModel } from '../../info/models';
import * as process from 'process';
import { prettyTime, prettyBytes } from '../../../helpers';
import { getEnvFilePaths } from '../utils/env-paths.util';

/**
 * Environment variable keys used by the application
 */
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
  DOWNLOADER_ARBITRARY_DOWNLOADS_RESTRICT_PATHS: 'DOWNLOADER_ARBITRARY_DOWNLOADS_RESTRICT_PATHS',
  CONSOLE_LOG_LEVELS: 'CONSOLE_LOG_LEVELS',
} as const;

/**
 * Configuration schema for validation using Zod
 * Validates all environment variables and their types
 */
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
  downloaderArbitraryDownloadsRestrictPaths: z.boolean().default(true),
  consoleLogLevels: z.array(z.string()).default(['log', 'warn', 'error']),
}).superRefine((data, ctx) => {
  // Validate that arbitrary downloads root folder exists when enabled
  if (data.downloaderArbitraryDownloadsEnabled) {
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

type ConfigData = z.infer<typeof configSchema>;

/**
 * Application configuration service that loads and validates environment variables
 * Provides type-safe access to all configuration values
 */
@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);
  private readonly config: ConfigData;

  constructor(private readonly configService: ConfigService) {
    this.logger.verbose('Loading configuration files in the following order...');
    getEnvFilePaths().forEach((source, idx) => {
      this.logger.verbose(`    ${idx}. ${source}`);
    });

    // Load and validate configuration
    const rawConfig = this.loadEnvConfig();
    const validation = configSchema.safeParse(rawConfig);
    
    if (!validation.success) {
      this.logger.error('❌ Configuration validation failed!');
      this.logger.warn('Please fix the following configuration errors:');

      (validation as any).error.issues.forEach((error: any) => {
        const fieldName = error.path.join('.');
        let errorMessage = `  - ${fieldName}: ${error.message}`;

        // Add helpful hints for common missing fields
        if (fieldName === 'putioClientId') {
          errorMessage += '\n      ℹ️  Set PUTIO_CLIENT_ID environment variable with your Put.io OAuth app ID';
        } else if (fieldName === 'putioClientSecret') {
          errorMessage += '\n      ℹ️  Set PUTIO_CLIENT_SECRET environment variable with your Put.io OAuth app secret';
        } else if (fieldName === 'putioAuth') {
          errorMessage += '\n      ℹ️  Set PUTIO_AUTH environment variable with your Put.io OAuth token';
        }

        this.logger.error(errorMessage);
      });

      this.logger.error('\n📚 See .env.example for configuration reference');

      // Don't exit during tests
      if (this.configService.get('NODE_ENV') === 'test') {
        throw new Error('Configuration validation failed');
      }
      process.exit(5);
    }

    this.config = validation.data;
    
    // Log configuration summary
    this.logConfiguration();
  }

  private loadEnvConfig(): Partial<ConfigData> {
    return {
      port: this.loadEnvInt(EnvKeys.PORT, 3000),
      host: this.loadEnvString(EnvKeys.HOST, 'http://localhost'),
      putioAuth: this.loadEnvString(EnvKeys.PUTIO_AUTH),
      putioClientId: this.loadEnvInt(EnvKeys.PUTIO_CLIENT_ID),
      putioClientSecret: this.loadEnvString(EnvKeys.PUTIO_CLIENT_SECRET),
      watcherEnabled: this.loadEnvBoolean(EnvKeys.WATCHER_ENABLED, true),
      watcherTargets: this.loadEnvTargets(EnvKeys.WATCHER_TARGETS),
      downloaderEnabled: this.loadEnvBoolean(EnvKeys.DOWNLOADER_ENABLED, true),
      downloaderTargets: this.loadEnvTargets(EnvKeys.DOWNLOADER_TARGETS),
      downloaderChunkSize: this.loadEnvInt(EnvKeys.DOWNLOADER_CHUNK_SIZE, 1024 * 1024 * 8),
      putioWatcherSocket: this.loadEnvBoolean(EnvKeys.PUTIO_ENABLE_SOCKET, true),
      putioWebhooksEnabled: this.loadEnvBoolean(EnvKeys.PUTIO_ENABLE_WEBHOOKS, false),
      putioCheckCronSchedule: this.loadEnvString(EnvKeys.PUTIO_CHECK_CRON_SCHEDULE),
      putioCheckAtStartup: this.loadEnvBoolean(EnvKeys.PUTIO_CHECK_AT_STARTUP, true),
      uiProgressUpdateInterval: this.loadEnvInt(EnvKeys.UI_PROGRESS_UPDATE_INTERVAL, 333),
      concurrentGroups: this.loadEnvInt(EnvKeys.CONCURRENT_GROUPS, 2),
      concurrentSmallFiles: this.loadEnvInt(EnvKeys.CONCURRENT_SMALL_FILES, 8),
      concurrentLargeFiles: this.loadEnvInt(EnvKeys.CONCURRENT_LARGE_FILES, 2),
      downloaderPerformanceMonitoringEnabled: this.loadEnvBoolean(EnvKeys.DOWNLOADER_PERFORMANCE_MONITORING_ENABLED, true),
      downloaderPerformanceMonitoringTime: this.loadEnvInt(EnvKeys.DOWNLOADER_PERFORMANCE_MONITORING_TIME, 10),
      downloaderPerformanceMonitoringSpeed: this.loadEnvInt(EnvKeys.DOWNLOADER_PERFORMANCE_MONITORING_SPEED, 0),
      downloaderArbitraryDownloadsEnabled: this.loadEnvBoolean(EnvKeys.DOWNLOADER_ARBITRARY_DOWNLOADS_ENABLED, false),
      downloaderArbitraryDownloadsRootFolder: this.loadEnvString(EnvKeys.DOWNLOADER_ARBITRARY_DOWNLOADS_ROOT_FOLDER, '/mnt'),
      downloaderArbitraryDownloadsRestrictPaths: this.loadEnvBoolean(EnvKeys.DOWNLOADER_ARBITRARY_DOWNLOADS_RESTRICT_PATHS, true),
      consoleLogLevels: this.filterValidLogLevels(
        this.loadEnvArray(EnvKeys.CONSOLE_LOG_LEVELS, ['log', 'warn', 'error'])
      ),
    };
  }

  private filterValidLogLevels(levels: string[]): ('log' | 'warn' | 'error' | 'debug' | 'verbose')[] {
    const validLevels = ['log', 'warn', 'error', 'debug', 'verbose'];
    const filtered = levels.filter(level => validLevels.includes(level));

    // Warn about invalid levels
    const invalidLevels = levels.filter(level => !validLevels.includes(level));
    if (invalidLevels.length > 0) {
      this.logger.warn(`⚠️  Ignoring invalid log levels: ${invalidLevels.join(', ')}`);
      this.logger.warn(`   Valid levels are: ${validLevels.join(', ')}`);
    }

    // Return filtered levels or default if none are valid
    return filtered.length > 0
      ? filtered as ('log' | 'warn' | 'error' | 'debug' | 'verbose')[]
      : ['log', 'warn', 'error'];
  }

  private loadEnvInt(name: string, defaultValue?: number): number | undefined {
    const value = this.configService.get(name);
    return value ? parseInt(value, 10) : defaultValue;
  }

  private loadEnvString(name: string, defaultValue?: string): string | undefined {
    const value = this.configService.get(name);
    return value || defaultValue;
  }

  private loadEnvArray(name: string, defaultValue?: string[]): string[] | undefined {
    const value = this.configService.get(name);
    return value ? value.split(',').map((v) => v.trim()) : defaultValue;
  }

  private loadEnvBoolean(name: string, defaultValue?: boolean): boolean | undefined {
    const value = this.configService.get(name);
    return value ? value === 'true' : defaultValue;
  }

  private loadEnvTargets(name: string): TargetModel[] {
    const value = this.configService.get(name);
    if (!value) {
      return [];
    }

    const datasets = value.split(';');
    const targets: TargetModel[] = [];
    
    for (const dataset of datasets) {
      const [path, targetId] = dataset.split(':');
      if (path && targetId) {
        targets.push({ 
          targetId: parseInt(targetId, 10), 
          path: path.trim() 
        });
      }
    }

    return targets;
  }

  private logConfiguration(): void {
    // Pretty print the configuration
    this.logger.verbose(`Configuration loaded:`);
    this.logger.verbose(`  - Port: ${this.port}`);
    this.logger.verbose(`  - Host: ${this.host}`);

    this.logger.verbose(`  - Put.io Client ID: ${this.putioClientId}`);
    this.logger.verbose(`  - Put.io Client Secret: ${this.putioClientSecret.slice(-4).padStart(this.putioClientSecret.length, '*')}`);
    this.logger.verbose(`  - Put.io Auth: ${this.putioAuth.slice(-4).padStart(this.putioAuth.length, '*')}`)

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
    this.logger.verbose(`  - Downloader Arbitrary Downloads Enabled: ${this.downloaderArbitraryDownloadsEnabled}`);
    this.logger.verbose(`  - Downloader Arbitrary Downloads Root Folder: ${this.downloaderArbitraryDownloadsRootFolder}`);
    this.logger.verbose(`  - Downloader Arbitrary Downloads Restrict Paths: ${this.downloaderArbitraryDownloadsRestrictPaths}`);
    this.logger.verbose(`  - Console Log Levels: ${this.consoleLogLevels.join(', ')}`);
  }

  // Environment checks
  get isDev(): boolean {
    return this.configService.get('NODE_ENV') === 'development';
  }

  get isProd(): boolean {
    return this.configService.get('NODE_ENV') === 'production';
  }

  get isTest(): boolean {
    return this.configService.get('NODE_ENV') === 'test';
  }

  // Configuration getters
  get consoleLogLevels(): LogLevel[] {
    return this.config.consoleLogLevels as LogLevel[];
  }

  get port(): number {
    return this.config.port;
  }

  get host(): string {
    return this.config.host;
  }

  get putioAuth(): string {
    return this.config.putioAuth;
  }

  get putioClientId(): number {
    return this.config.putioClientId;
  }

  get putioClientSecret(): string {
    return this.config.putioClientSecret;
  }

  get watcherEnabled(): boolean {
    return this.config.watcherEnabled;
  }

  get watcherTargets(): TargetModel[] {
    return this.config.watcherTargets as TargetModel[];
  }

  get putioWatcherSocket(): boolean {
    return this.config.putioWatcherSocket;
  }

  get putioWebhooksEnabled(): boolean {
    return this.config.putioWebhooksEnabled;
  }

  get putioCheckCronSchedule(): string | undefined {
    return this.config.putioCheckCronSchedule;
  }

  get putioCheckAtStartup(): boolean {
    return this.config.putioCheckAtStartup;
  }

  get downloaderEnabled(): boolean {
    return this.config.downloaderEnabled;
  }

  get downloaderTargets(): TargetModel[] {
    return this.config.downloaderTargets as TargetModel[];
  }

  get downloaderChunkSize(): number {
    return this.config.downloaderChunkSize;
  }

  get uiProgressUpdateInterval(): number {
    return this.config.uiProgressUpdateInterval;
  }

  get concurrentGroups(): number {
    return this.config.concurrentGroups;
  }

  get concurrentSmallFiles(): number {
    return this.config.concurrentSmallFiles;
  }

  get concurrentLargeFiles(): number {
    return this.config.concurrentLargeFiles;
  }

  get downloaderPerformanceMonitoringEnabled(): boolean {
    return this.config.downloaderPerformanceMonitoringEnabled;
  }

  get downloaderPerformanceMonitoringTime(): number {
    return this.config.downloaderPerformanceMonitoringTime;
  }

  get downloaderPerformanceMonitoringSpeed(): number {
    // Auto-calculate if not set
    if (this.config.downloaderPerformanceMonitoringSpeed === 0) {
      return Math.floor(this.config.downloaderChunkSize * 0.8);
    }
    return this.config.downloaderPerformanceMonitoringSpeed;
  }

  get downloaderArbitraryDownloadsEnabled(): boolean {
    return this.config.downloaderArbitraryDownloadsEnabled;
  }

  get downloaderArbitraryDownloadsRootFolder(): string {
    return this.config.downloaderArbitraryDownloadsRootFolder;
  }

  get downloaderArbitraryDownloadsRestrictPaths(): boolean {
    return this.config.downloaderArbitraryDownloadsRestrictPaths;
  }
}