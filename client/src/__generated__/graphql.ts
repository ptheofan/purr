/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: any; output: any; }
};

/** The app configuration. */
export type AppConfig = {
  __typename?: 'AppConfig';
  concurrentGroups: Scalars['Int']['output'];
  concurrentLargeFiles: Scalars['Int']['output'];
  concurrentSmallFiles: Scalars['Int']['output'];
  downloaderChunkSize: Scalars['Int']['output'];
  downloaderEnabled: Scalars['Boolean']['output'];
  downloaderPerformanceMonitoringEnabled: Scalars['Boolean']['output'];
  downloaderPerformanceMonitoringSpeed: Scalars['Int']['output'];
  downloaderPerformanceMonitoringTime: Scalars['Int']['output'];
  downloaderTargets: Array<TargetModel>;
  host: Scalars['String']['output'];
  port: Scalars['Int']['output'];
  putioAuth: Scalars['String']['output'];
  putioCheckAtStartup: Scalars['Int']['output'];
  putioCheckCronSchedule?: Maybe<Scalars['String']['output']>;
  putioClientId: Scalars['Int']['output'];
  putioClientSecret: Scalars['String']['output'];
  putioWatcherSocket: Scalars['Int']['output'];
  putioWebhooksEnabled: Scalars['Int']['output'];
  uiProgressUpdateInterval: Scalars['Int']['output'];
  watcherEnabled: Scalars['Boolean']['output'];
  watcherTargets: Array<TargetModel>;
};

export type CreatePutioDownloadResultDto = {
  __typename?: 'CreatePutioDownloadResultDto';
  group?: Maybe<Group>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DownloadManagerStatsDto = {
  __typename?: 'DownloadManagerStatsDto';
  histogram?: Maybe<HistogramDto>;
  lifetimeBytes: Scalars['Int']['output'];
  speed: Scalars['Int']['output'];
  startedAt: Scalars['DateTime']['output'];
};

/** The status of this download */
export enum DownloadStatus {
  Completed = 'Completed',
  Downloading = 'Downloading',
  Error = 'Error',
  Paused = 'Paused',
  Pending = 'Pending'
}

/** A group represents a set of files that should be downloaded together. */
export type Group = {
  __typename?: 'Group';
  addedAt: Scalars['DateTime']['output'];
  id: Scalars['Float']['output'];
  items?: Maybe<Array<Item>>;
  name: Scalars['String']['output'];
  saveAt: Scalars['String']['output'];
  state: GroupState;
  status: DownloadStatus;
};

/** The state of this group */
export enum GroupState {
  Initializing = 'Initializing',
  Ready = 'Ready'
}

export type GroupStateChangedDto = {
  __typename?: 'GroupStateChangedDto';
  id: Scalars['Float']['output'];
  state: GroupState;
};

export type HistogramDto = {
  __typename?: 'HistogramDto';
  /** The granularity of the histogram in seconds. ie. 60 means each values[x] represents 1 minute of data */
  granularity: Scalars['Float']['output'];
  since: Scalars['DateTime']['output'];
  until: Scalars['DateTime']['output'];
  values: Array<Scalars['Float']['output']>;
};

/** An item represents a file that should be downloaded. */
export type Item = {
  __typename?: 'Item';
  crc32?: Maybe<Scalars['String']['output']>;
  downloadLink?: Maybe<Scalars['String']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  groupId: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  relativePath: Scalars['String']['output'];
  size: Scalars['Int']['output'];
  status: DownloadStatus;
};

export type ItemStatusChangedDto = {
  __typename?: 'ItemStatusChangedDto';
  id: Scalars['Float']['output'];
  status: DownloadStatus;
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Create a new download from a put.io fileId */
  createDownloadFromPutio: CreatePutioDownloadResultDto;
};


export type MutationCreateDownloadFromPutioArgs = {
  putioId: Scalars['Int']['input'];
  saveAt: Scalars['String']['input'];
};

export type Query = {
  __typename?: 'Query';
  appConfig: AppConfig;
  getGroup: Group;
  getGroups: Array<Group>;
  items: Array<Item>;
};


export type QueryGetGroupArgs = {
  id: Scalars['Int']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  downloadManagerStats: DownloadManagerStatsDto;
  groupAdded: Group;
  groupStateChanged: GroupStateChangedDto;
  groupStatusChanged: GroupStateChangedDto;
  itemStatusChanged: ItemStatusChangedDto;
};

export type TargetModel = {
  __typename?: 'TargetModel';
  path: Scalars['String']['output'];
  targetId: Scalars['Int']['output'];
  targetPath?: Maybe<Scalars['String']['output']>;
};

export type AppConfigQueryVariables = Exact<{ [key: string]: never; }>;


export type AppConfigQuery = { __typename?: 'Query', appConfig: { __typename?: 'AppConfig', concurrentGroups: number, concurrentLargeFiles: number, concurrentSmallFiles: number, downloaderChunkSize: number, downloaderEnabled: boolean, downloaderPerformanceMonitoringEnabled: boolean, downloaderPerformanceMonitoringSpeed: number, downloaderPerformanceMonitoringTime: number, host: string, port: number, putioAuth: string, putioCheckAtStartup: number, putioCheckCronSchedule?: string | null, putioClientId: number, putioClientSecret: string, putioWatcherSocket: number, putioWebhooksEnabled: number, uiProgressUpdateInterval: number, watcherEnabled: boolean, downloaderTargets: Array<{ __typename?: 'TargetModel', path: string, targetId: number, targetPath?: string | null }>, watcherTargets: Array<{ __typename?: 'TargetModel', path: string, targetId: number, targetPath?: string | null }> } };


export const AppConfigDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AppConfig"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"appConfig"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"concurrentGroups"}},{"kind":"Field","name":{"kind":"Name","value":"concurrentLargeFiles"}},{"kind":"Field","name":{"kind":"Name","value":"concurrentSmallFiles"}},{"kind":"Field","name":{"kind":"Name","value":"downloaderChunkSize"}},{"kind":"Field","name":{"kind":"Name","value":"downloaderEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"downloaderPerformanceMonitoringEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"downloaderPerformanceMonitoringSpeed"}},{"kind":"Field","name":{"kind":"Name","value":"downloaderPerformanceMonitoringTime"}},{"kind":"Field","name":{"kind":"Name","value":"downloaderTargets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"targetId"}},{"kind":"Field","name":{"kind":"Name","value":"targetPath"}}]}},{"kind":"Field","name":{"kind":"Name","value":"host"}},{"kind":"Field","name":{"kind":"Name","value":"port"}},{"kind":"Field","name":{"kind":"Name","value":"putioAuth"}},{"kind":"Field","name":{"kind":"Name","value":"putioCheckAtStartup"}},{"kind":"Field","name":{"kind":"Name","value":"putioCheckCronSchedule"}},{"kind":"Field","name":{"kind":"Name","value":"putioClientId"}},{"kind":"Field","name":{"kind":"Name","value":"putioClientSecret"}},{"kind":"Field","name":{"kind":"Name","value":"putioWatcherSocket"}},{"kind":"Field","name":{"kind":"Name","value":"putioWebhooksEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"uiProgressUpdateInterval"}},{"kind":"Field","name":{"kind":"Name","value":"watcherEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"watcherTargets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"targetId"}},{"kind":"Field","name":{"kind":"Name","value":"targetPath"}}]}}]}}]}}]} as unknown as DocumentNode<AppConfigQuery, AppConfigQueryVariables>;