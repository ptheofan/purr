export abstract class DownloadError extends Error {
  abstract readonly retryable: boolean;
  abstract readonly errorType: string;

  constructor(
    message: string,
    public readonly instanceId?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NetworkError extends DownloadError {
  readonly retryable = true;
  readonly errorType = 'network';

  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly url?: string,
    instanceId?: string,
    cause?: Error
  ) {
    super(message, instanceId, cause);
  }
}

export class FileSystemError extends DownloadError {
  readonly retryable = false;
  readonly errorType = 'filesystem';

  constructor(
    message: string,
    public readonly path?: string,
    public readonly operation?: 'read' | 'write' | 'delete' | 'create',
    instanceId?: string,
    cause?: Error
  ) {
    super(message, instanceId, cause);
  }
}

export class ValidationError extends DownloadError {
  readonly retryable = false;
  readonly errorType = 'validation';

  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown,
    instanceId?: string,
    cause?: Error
  ) {
    super(message, instanceId, cause);
  }
}

export class WorkerError extends DownloadError {
  readonly retryable = true;
  readonly errorType = 'worker';

  constructor(
    message: string,
    public readonly workerId: string,
    public readonly retryCount: number = 0,
    instanceId?: string,
    cause?: Error
  ) {
    super(message, instanceId, cause);
  }
}

export class RangeError extends DownloadError {
  readonly retryable = true;
  readonly errorType = 'range';

  constructor(
    message: string,
    public readonly start: number,
    public readonly end: number,
    instanceId?: string,
    cause?: Error
  ) {
    super(message, instanceId, cause);
  }
}

export class TimeoutError extends NetworkError {
  constructor(
    message: string,
    public readonly timeoutMs: number,
    url?: string,
    instanceId?: string,
    cause?: Error
  ) {
    super(message, undefined, url, instanceId, cause);
  }
}

export class SpeedThresholdError extends DownloadError {
  readonly retryable = true;
  readonly errorType = 'speed';

  constructor(
    message: string,
    public readonly currentSpeed: number,
    public readonly minSpeed: number,
    public readonly duration: number,
    instanceId?: string,
    cause?: Error
  ) {
    super(message, instanceId, cause);
  }
}

export class ResourceExhaustedError extends DownloadError {
  readonly retryable = false;
  readonly errorType = 'resource';

  constructor(
    message: string,
    public readonly resourceType: 'memory' | 'disk' | 'filehandles' | 'workers',
    instanceId?: string,
    cause?: Error
  ) {
    super(message, instanceId, cause);
  }
}