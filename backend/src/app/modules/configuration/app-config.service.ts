import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseInt } from 'lodash';

export type Target = {
  path: string;
  targetId: number;
}

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
  PUTIO_ENABLE_SOCKET: 'PUTIO_ENABLE_SOCKET',
  PUTIO_ENABLE_WEBHOOKS: 'PUTIO_ENABLE_WEBHOOKS',
  PUTIO_CHECK_CRON_SCHEDULE: 'PUTIO_CHECK_CRON_SCHEDULE',
  PUTIO_CHECK_AT_STARTUP: 'PUTIO_CHECK_AT_STARTUP',
}

@Injectable()
export class AppConfigService {
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

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.loadEnvConfig();
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
    this._putioWatcherSocket = this.loadEnvBoolean(EnvKeys.PUTIO_ENABLE_SOCKET, true);
    this._putioWebhooksEnabled = this.loadEnvBoolean(EnvKeys.PUTIO_ENABLE_WEBHOOKS, false);
    this._putioCheckCronSchedule = this.loadEnvString(EnvKeys.PUTIO_CHECK_CRON_SCHEDULE, '*/60 * * * * *');
    if (this._putioCheckCronSchedule.toLowerCase().trim() === 'false') {
      this._putioCheckCronSchedule = undefined;
    }
    this._putioCheckAtStartup = this.loadEnvBoolean(EnvKeys.PUTIO_CHECK_AT_STARTUP, true);
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
}
