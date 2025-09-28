/* eslint-disable */
import * as types from "./graphql";
import type { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";

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
  "\n  fragment AppConfigBasic on AppConfig {\n    concurrentGroups\n    concurrentLargeFiles\n    concurrentSmallFiles\n    downloaderChunkSize\n    downloaderEnabled\n    host\n    port\n  }\n":
    types.AppConfigBasicFragmentDoc,
  "\n  fragment AppConfigAdvanced on AppConfig {\n    downloaderPerformanceMonitoringEnabled\n    downloaderPerformanceMonitoringSpeed\n    downloaderPerformanceMonitoringTime\n    uiProgressUpdateInterval\n    watcherEnabled\n  }\n":
    types.AppConfigAdvancedFragmentDoc,
  "\n  fragment AppConfigPutio on AppConfig {\n    putioAuth\n    putioCheckAtStartup\n    putioCheckCronSchedule\n    putioClientId\n    putioClientSecret\n    putioWatcherSocket\n    putioWebhooksEnabled\n  }\n":
    types.AppConfigPutioFragmentDoc,
  "\n  fragment AppConfigTargets on AppConfig {\n    downloaderTargets {\n      path\n      targetId\n      targetPath\n    }\n    watcherTargets {\n      path\n      targetId\n      targetPath\n    }\n  }\n":
    types.AppConfigTargetsFragmentDoc,
  "\n  fragment GroupBasicInfo on Group {\n    id\n    name\n    status\n    state\n    addedAt\n    saveAt\n  }\n":
    types.GroupBasicInfoFragmentDoc,
  "\n  fragment GroupWithItems on Group {\n    ...GroupBasicInfo\n    items {\n      id\n      name\n      size\n      status\n      relativePath\n      error\n    }\n  }\n":
    types.GroupWithItemsFragmentDoc,
  "\n  fragment ItemBasicInfo on Item {\n    id\n    name\n    size\n    status\n    relativePath\n    groupId\n  }\n":
    types.ItemBasicInfoFragmentDoc,
  "\n  fragment ItemWithDetails on Item {\n    ...ItemBasicInfo\n    crc32\n    downloadLink\n    error\n  }\n":
    types.ItemWithDetailsFragmentDoc,
  "\n  fragment DownloadManagerStats on DownloadManagerStatsDto {\n    lifetimeBytes\n    speed\n    startedAt\n    histogram {\n      granularity\n      since\n      until\n      values\n    }\n  }\n":
    types.DownloadManagerStatsFragmentDoc,
  "\n  fragment ItemStats on ItemStatsDto {\n    itemId\n    downloadedBytes\n    bytesSinceLastEvent\n    speed\n    startedAt\n    restartedAt\n    fragments {\n      start\n      end\n      status\n    }\n    histogram {\n      granularity\n      since\n      until\n      values\n    }\n    workers {\n      id\n      downloadedBytes\n      speed\n    }\n  }\n":
    types.ItemStatsFragmentDoc,
  "\n  mutation CreateDownloadFromPutio($putioId: Int!, $saveAt: String!) {\n    createDownloadFromPutio(putioId: $putioId, saveAt: $saveAt) {\n      success\n      message\n      group {\n        ...GroupWithItems\n      }\n    }\n  }\n":
    types.CreateDownloadFromPutioDocument,
  "\n  query GetAppConfig {\n    appConfig {\n      ...AppConfigBasic\n      ...AppConfigAdvanced\n      ...AppConfigPutio\n      ...AppConfigTargets\n    }\n  }\n":
    types.GetAppConfigDocument,
  "\n  query GetAppConfigBasic {\n    appConfig {\n      ...AppConfigBasic\n    }\n  }\n":
    types.GetAppConfigBasicDocument,
  "\n  query GetGroups {\n    getGroups {\n      ...GroupBasicInfo\n      ...GroupWithItems\n    }\n  }\n":
    types.GetGroupsDocument,
  "\n  query GetGroup($id: Int!) {\n    getGroup(id: $id) {\n      ...GroupBasicInfo\n      ...GroupWithItems\n    }\n  }\n":
    types.GetGroupDocument,
  "\n  query GetItems {\n    getItems {\n      ...ItemWithDetails\n    }\n  }\n":
    types.GetItemsDocument,
  "\n  query GetItem($id: Int!) {\n    getItem(id: $id) {\n      ...ItemWithDetails\n    }\n  }\n":
    types.GetItemDocument,
  "\n  subscription DownloadManagerStats {\n    downloadManagerStats {\n      ...DownloadManagerStats\n    }\n  }\n":
    types.DownloadManagerStatsDocument,
  "\n  subscription GroupAdded {\n    groupAdded {\n      ...GroupBasicInfo\n      ...GroupWithItems\n    }\n  }\n":
    types.GroupAddedDocument,
  "\n  subscription GroupStateChanged {\n    groupStateChanged {\n      id\n      state\n    }\n  }\n":
    types.GroupStateChangedDocument,
  "\n  subscription GroupStatusChanged {\n    groupStatusChanged {\n      id\n      status\n    }\n  }\n":
    types.GroupStatusChangedDocument,
  "\n  subscription ItemStatusChanged {\n    itemStatusChanged {\n      id\n      status\n    }\n  }\n":
    types.ItemStatusChangedDocument,
  "\n  subscription ItemStatsUpdated {\n    itemStatsUpdated {\n      ...ItemStats\n    }\n  }\n":
    types.ItemStatsUpdatedDocument,
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
export function gql(
  source: "\n  fragment AppConfigBasic on AppConfig {\n    concurrentGroups\n    concurrentLargeFiles\n    concurrentSmallFiles\n    downloaderChunkSize\n    downloaderEnabled\n    host\n    port\n  }\n",
): (typeof documents)["\n  fragment AppConfigBasic on AppConfig {\n    concurrentGroups\n    concurrentLargeFiles\n    concurrentSmallFiles\n    downloaderChunkSize\n    downloaderEnabled\n    host\n    port\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  fragment AppConfigAdvanced on AppConfig {\n    downloaderPerformanceMonitoringEnabled\n    downloaderPerformanceMonitoringSpeed\n    downloaderPerformanceMonitoringTime\n    uiProgressUpdateInterval\n    watcherEnabled\n  }\n",
): (typeof documents)["\n  fragment AppConfigAdvanced on AppConfig {\n    downloaderPerformanceMonitoringEnabled\n    downloaderPerformanceMonitoringSpeed\n    downloaderPerformanceMonitoringTime\n    uiProgressUpdateInterval\n    watcherEnabled\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  fragment AppConfigPutio on AppConfig {\n    putioAuth\n    putioCheckAtStartup\n    putioCheckCronSchedule\n    putioClientId\n    putioClientSecret\n    putioWatcherSocket\n    putioWebhooksEnabled\n  }\n",
): (typeof documents)["\n  fragment AppConfigPutio on AppConfig {\n    putioAuth\n    putioCheckAtStartup\n    putioCheckCronSchedule\n    putioClientId\n    putioClientSecret\n    putioWatcherSocket\n    putioWebhooksEnabled\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  fragment AppConfigTargets on AppConfig {\n    downloaderTargets {\n      path\n      targetId\n      targetPath\n    }\n    watcherTargets {\n      path\n      targetId\n      targetPath\n    }\n  }\n",
): (typeof documents)["\n  fragment AppConfigTargets on AppConfig {\n    downloaderTargets {\n      path\n      targetId\n      targetPath\n    }\n    watcherTargets {\n      path\n      targetId\n      targetPath\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  fragment GroupBasicInfo on Group {\n    id\n    name\n    status\n    state\n    addedAt\n    saveAt\n  }\n",
): (typeof documents)["\n  fragment GroupBasicInfo on Group {\n    id\n    name\n    status\n    state\n    addedAt\n    saveAt\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  fragment GroupWithItems on Group {\n    ...GroupBasicInfo\n    items {\n      id\n      name\n      size\n      status\n      relativePath\n      error\n    }\n  }\n",
): (typeof documents)["\n  fragment GroupWithItems on Group {\n    ...GroupBasicInfo\n    items {\n      id\n      name\n      size\n      status\n      relativePath\n      error\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  fragment ItemBasicInfo on Item {\n    id\n    name\n    size\n    status\n    relativePath\n    groupId\n  }\n",
): (typeof documents)["\n  fragment ItemBasicInfo on Item {\n    id\n    name\n    size\n    status\n    relativePath\n    groupId\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  fragment ItemWithDetails on Item {\n    ...ItemBasicInfo\n    crc32\n    downloadLink\n    error\n  }\n",
): (typeof documents)["\n  fragment ItemWithDetails on Item {\n    ...ItemBasicInfo\n    crc32\n    downloadLink\n    error\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  fragment DownloadManagerStats on DownloadManagerStatsDto {\n    lifetimeBytes\n    speed\n    startedAt\n    histogram {\n      granularity\n      since\n      until\n      values\n    }\n  }\n",
): (typeof documents)["\n  fragment DownloadManagerStats on DownloadManagerStatsDto {\n    lifetimeBytes\n    speed\n    startedAt\n    histogram {\n      granularity\n      since\n      until\n      values\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  fragment ItemStats on ItemStatsDto {\n    itemId\n    downloadedBytes\n    bytesSinceLastEvent\n    speed\n    startedAt\n    restartedAt\n    fragments {\n      start\n      end\n      status\n    }\n    histogram {\n      granularity\n      since\n      until\n      values\n    }\n    workers {\n      id\n      downloadedBytes\n      speed\n    }\n  }\n",
): (typeof documents)["\n  fragment ItemStats on ItemStatsDto {\n    itemId\n    downloadedBytes\n    bytesSinceLastEvent\n    speed\n    startedAt\n    restartedAt\n    fragments {\n      start\n      end\n      status\n    }\n    histogram {\n      granularity\n      since\n      until\n      values\n    }\n    workers {\n      id\n      downloadedBytes\n      speed\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  mutation CreateDownloadFromPutio($putioId: Int!, $saveAt: String!) {\n    createDownloadFromPutio(putioId: $putioId, saveAt: $saveAt) {\n      success\n      message\n      group {\n        ...GroupWithItems\n      }\n    }\n  }\n",
): (typeof documents)["\n  mutation CreateDownloadFromPutio($putioId: Int!, $saveAt: String!) {\n    createDownloadFromPutio(putioId: $putioId, saveAt: $saveAt) {\n      success\n      message\n      group {\n        ...GroupWithItems\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  query GetAppConfig {\n    appConfig {\n      ...AppConfigBasic\n      ...AppConfigAdvanced\n      ...AppConfigPutio\n      ...AppConfigTargets\n    }\n  }\n",
): (typeof documents)["\n  query GetAppConfig {\n    appConfig {\n      ...AppConfigBasic\n      ...AppConfigAdvanced\n      ...AppConfigPutio\n      ...AppConfigTargets\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  query GetAppConfigBasic {\n    appConfig {\n      ...AppConfigBasic\n    }\n  }\n",
): (typeof documents)["\n  query GetAppConfigBasic {\n    appConfig {\n      ...AppConfigBasic\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  query GetGroups {\n    getGroups {\n      ...GroupBasicInfo\n      ...GroupWithItems\n    }\n  }\n",
): (typeof documents)["\n  query GetGroups {\n    getGroups {\n      ...GroupBasicInfo\n      ...GroupWithItems\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  query GetGroup($id: Int!) {\n    getGroup(id: $id) {\n      ...GroupBasicInfo\n      ...GroupWithItems\n    }\n  }\n",
): (typeof documents)["\n  query GetGroup($id: Int!) {\n    getGroup(id: $id) {\n      ...GroupBasicInfo\n      ...GroupWithItems\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  query GetItems {\n    getItems {\n      ...ItemWithDetails\n    }\n  }\n",
): (typeof documents)["\n  query GetItems {\n    getItems {\n      ...ItemWithDetails\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  query GetItem($id: Int!) {\n    getItem(id: $id) {\n      ...ItemWithDetails\n    }\n  }\n",
): (typeof documents)["\n  query GetItem($id: Int!) {\n    getItem(id: $id) {\n      ...ItemWithDetails\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  subscription DownloadManagerStats {\n    downloadManagerStats {\n      ...DownloadManagerStats\n    }\n  }\n",
): (typeof documents)["\n  subscription DownloadManagerStats {\n    downloadManagerStats {\n      ...DownloadManagerStats\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  subscription GroupAdded {\n    groupAdded {\n      ...GroupBasicInfo\n      ...GroupWithItems\n    }\n  }\n",
): (typeof documents)["\n  subscription GroupAdded {\n    groupAdded {\n      ...GroupBasicInfo\n      ...GroupWithItems\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  subscription GroupStateChanged {\n    groupStateChanged {\n      id\n      state\n    }\n  }\n",
): (typeof documents)["\n  subscription GroupStateChanged {\n    groupStateChanged {\n      id\n      state\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  subscription GroupStatusChanged {\n    groupStatusChanged {\n      id\n      status\n    }\n  }\n",
): (typeof documents)["\n  subscription GroupStatusChanged {\n    groupStatusChanged {\n      id\n      status\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  subscription ItemStatusChanged {\n    itemStatusChanged {\n      id\n      status\n    }\n  }\n",
): (typeof documents)["\n  subscription ItemStatusChanged {\n    itemStatusChanged {\n      id\n      status\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(
  source: "\n  subscription ItemStatsUpdated {\n    itemStatsUpdated {\n      ...ItemStats\n    }\n  }\n",
): (typeof documents)["\n  subscription ItemStatsUpdated {\n    itemStatsUpdated {\n      ...ItemStats\n    }\n  }\n"];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> =
  TDocumentNode extends DocumentNode<infer TType, any> ? TType : never;
