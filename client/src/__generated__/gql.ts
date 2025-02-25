/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 */
const documents = {
    "\n    query AppConfig {\n        appConfig {\n            concurrentGroups\n            concurrentLargeFiles\n            concurrentSmallFiles\n            downloaderChunkSize\n            downloaderEnabled\n            downloaderPerformanceMonitoringEnabled\n            downloaderPerformanceMonitoringSpeed\n            downloaderPerformanceMonitoringTime\n            downloaderTargets {\n                path\n                targetId\n                targetPath\n            }\n            host\n            port\n            putioAuth\n            putioCheckAtStartup\n            putioCheckCronSchedule\n            putioClientId\n            putioClientSecret\n            putioWatcherSocket\n            putioWebhooksEnabled\n            uiProgressUpdateInterval\n            watcherEnabled\n            watcherTargets {\n                path\n                targetId\n                targetPath\n            }\n        }\n    }\n": types.AppConfigDocument,
    "\n    subscription GroupAdded {\n        groupAdded {\n            addedAt\n            id\n            items {\n                name\n                size\n                status\n            }\n            name\n            saveAt\n            state\n            status\n        }\n    }\n": types.GroupAddedDocument,
    "\n    subscription GroupStateChanged {\n        groupStateChanged {\n            id\n            state\n        }\n    }\n": types.GroupStateChangedDocument,
    "\n    subscription GroupStatusChanged {\n        groupStatusChanged {\n            id\n            status\n        }\n    }\n": types.GroupStatusChangedDocument,
    "\n    subscription ItemStatsUpdated {\n        itemStatsUpdated {\n            downloadedBytes\n            itemId\n            restartedAt\n            speed\n            startedAt\n        }\n    }\n": types.ItemStatsUpdatedDocument,
    "\n    subscription ItemStatusChanged {\n        itemStatusChanged {\n            status\n            id\n        }\n    }\n": types.ItemStatusChangedDocument,
};

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = gql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function gql(source: string): unknown;

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n    query AppConfig {\n        appConfig {\n            concurrentGroups\n            concurrentLargeFiles\n            concurrentSmallFiles\n            downloaderChunkSize\n            downloaderEnabled\n            downloaderPerformanceMonitoringEnabled\n            downloaderPerformanceMonitoringSpeed\n            downloaderPerformanceMonitoringTime\n            downloaderTargets {\n                path\n                targetId\n                targetPath\n            }\n            host\n            port\n            putioAuth\n            putioCheckAtStartup\n            putioCheckCronSchedule\n            putioClientId\n            putioClientSecret\n            putioWatcherSocket\n            putioWebhooksEnabled\n            uiProgressUpdateInterval\n            watcherEnabled\n            watcherTargets {\n                path\n                targetId\n                targetPath\n            }\n        }\n    }\n"): (typeof documents)["\n    query AppConfig {\n        appConfig {\n            concurrentGroups\n            concurrentLargeFiles\n            concurrentSmallFiles\n            downloaderChunkSize\n            downloaderEnabled\n            downloaderPerformanceMonitoringEnabled\n            downloaderPerformanceMonitoringSpeed\n            downloaderPerformanceMonitoringTime\n            downloaderTargets {\n                path\n                targetId\n                targetPath\n            }\n            host\n            port\n            putioAuth\n            putioCheckAtStartup\n            putioCheckCronSchedule\n            putioClientId\n            putioClientSecret\n            putioWatcherSocket\n            putioWebhooksEnabled\n            uiProgressUpdateInterval\n            watcherEnabled\n            watcherTargets {\n                path\n                targetId\n                targetPath\n            }\n        }\n    }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n    subscription GroupAdded {\n        groupAdded {\n            addedAt\n            id\n            items {\n                name\n                size\n                status\n            }\n            name\n            saveAt\n            state\n            status\n        }\n    }\n"): (typeof documents)["\n    subscription GroupAdded {\n        groupAdded {\n            addedAt\n            id\n            items {\n                name\n                size\n                status\n            }\n            name\n            saveAt\n            state\n            status\n        }\n    }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n    subscription GroupStateChanged {\n        groupStateChanged {\n            id\n            state\n        }\n    }\n"): (typeof documents)["\n    subscription GroupStateChanged {\n        groupStateChanged {\n            id\n            state\n        }\n    }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n    subscription GroupStatusChanged {\n        groupStatusChanged {\n            id\n            status\n        }\n    }\n"): (typeof documents)["\n    subscription GroupStatusChanged {\n        groupStatusChanged {\n            id\n            status\n        }\n    }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n    subscription ItemStatsUpdated {\n        itemStatsUpdated {\n            downloadedBytes\n            itemId\n            restartedAt\n            speed\n            startedAt\n        }\n    }\n"): (typeof documents)["\n    subscription ItemStatsUpdated {\n        itemStatsUpdated {\n            downloadedBytes\n            itemId\n            restartedAt\n            speed\n            startedAt\n        }\n    }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n    subscription ItemStatusChanged {\n        itemStatusChanged {\n            status\n            id\n        }\n    }\n"): (typeof documents)["\n    subscription ItemStatusChanged {\n        itemStatusChanged {\n            status\n            id\n        }\n    }\n"];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;