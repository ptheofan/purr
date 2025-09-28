/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T,
> = { [_ in K]?: never };
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never;
    };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  /** The `BigInt` scalar type represents non-fractional signed whole numeric values. */
  BigInt: { input: any; output: any };
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: any; output: any };
};

/** The app configuration. */
export type AppConfig = {
  __typename?: "AppConfig";
  concurrentGroups: Scalars["Int"]["output"];
  concurrentLargeFiles: Scalars["Int"]["output"];
  concurrentSmallFiles: Scalars["Int"]["output"];
  downloaderChunkSize: Scalars["Int"]["output"];
  downloaderEnabled: Scalars["Boolean"]["output"];
  downloaderPerformanceMonitoringEnabled: Scalars["Boolean"]["output"];
  downloaderPerformanceMonitoringSpeed: Scalars["Int"]["output"];
  downloaderPerformanceMonitoringTime: Scalars["Int"]["output"];
  downloaderTargets: Array<TargetModel>;
  host: Scalars["String"]["output"];
  port: Scalars["Int"]["output"];
  putioAuth: Scalars["String"]["output"];
  putioCheckAtStartup: Scalars["Int"]["output"];
  putioCheckCronSchedule?: Maybe<Scalars["String"]["output"]>;
  putioClientId: Scalars["Int"]["output"];
  putioClientSecret: Scalars["String"]["output"];
  putioWatcherSocket: Scalars["Int"]["output"];
  putioWebhooksEnabled: Scalars["Int"]["output"];
  uiProgressUpdateInterval: Scalars["Int"]["output"];
  watcherEnabled: Scalars["Boolean"]["output"];
  watcherTargets: Array<TargetModel>;
};

export type CreatePutioDownloadResultDto = {
  __typename?: "CreatePutioDownloadResultDto";
  group?: Maybe<Group>;
  message?: Maybe<Scalars["String"]["output"]>;
  success: Scalars["Boolean"]["output"];
};

export type DownloadManagerStatsDto = {
  __typename?: "DownloadManagerStatsDto";
  histogram?: Maybe<HistogramDto>;
  lifetimeBytes: Scalars["String"]["output"];
  speed: Scalars["BigInt"]["output"];
  startedAt: Scalars["DateTime"]["output"];
};

/** The status of this download */
export type DownloadStatus =
  | "Completed"
  | "Downloading"
  | "Error"
  | "Paused"
  | "Pending";

export type FragmentDto = {
  __typename?: "FragmentDto";
  end: Scalars["Int"]["output"];
  start: Scalars["Int"]["output"];
  status: FragmentStatus;
};

export type FragmentStatus = "finished" | "pending" | "reserved";

/** A group represents a set of files that should be downloaded together. */
export type Group = {
  __typename?: "Group";
  addedAt: Scalars["DateTime"]["output"];
  id: Scalars["Float"]["output"];
  items?: Maybe<Array<Item>>;
  name: Scalars["String"]["output"];
  saveAt: Scalars["String"]["output"];
  state: GroupState;
  status: DownloadStatus;
};

/** The state of this group */
export type GroupState = "Initializing" | "Ready";

export type GroupStateChangedDto = {
  __typename?: "GroupStateChangedDto";
  id: Scalars["Float"]["output"];
  state: GroupState;
};

export type GroupStatusChangedDto = {
  __typename?: "GroupStatusChangedDto";
  id: Scalars["Float"]["output"];
  status: DownloadStatus;
};

export type HistogramDto = {
  __typename?: "HistogramDto";
  /** The granularity of the histogram in seconds. ie. 60 means each values[x] represents 1 minute of data */
  granularity: Scalars["Float"]["output"];
  since: Scalars["DateTime"]["output"];
  until: Scalars["DateTime"]["output"];
  values: Array<Scalars["Float"]["output"]>;
};

/** An item represents a file that should be downloaded. */
export type Item = {
  __typename?: "Item";
  crc32?: Maybe<Scalars["String"]["output"]>;
  downloadLink?: Maybe<Scalars["String"]["output"]>;
  error?: Maybe<Scalars["String"]["output"]>;
  groupId: Scalars["Int"]["output"];
  id: Scalars["Int"]["output"];
  name: Scalars["String"]["output"];
  relativePath: Scalars["String"]["output"];
  size: Scalars["BigInt"]["output"];
  status: DownloadStatus;
};

export type ItemStatsDto = {
  __typename?: "ItemStatsDto";
  bytesSinceLastEvent: Scalars["BigInt"]["output"];
  downloadedBytes: Scalars["BigInt"]["output"];
  fragments: Array<FragmentDto>;
  histogram?: Maybe<HistogramDto>;
  itemId: Scalars["Int"]["output"];
  restartedAt?: Maybe<Scalars["DateTime"]["output"]>;
  speed: Scalars["BigInt"]["output"];
  startedAt?: Maybe<Scalars["DateTime"]["output"]>;
  workers: Array<WorkerStatsDto>;
};

export type ItemStatusChangedDto = {
  __typename?: "ItemStatusChangedDto";
  id: Scalars["Float"]["output"];
  status: DownloadStatus;
};

export type Mutation = {
  __typename?: "Mutation";
  /** Create a new download from a put.io fileId */
  createDownloadFromPutio: CreatePutioDownloadResultDto;
};

export type MutationCreateDownloadFromPutioArgs = {
  putioId: Scalars["Int"]["input"];
  saveAt: Scalars["String"]["input"];
};

export type Query = {
  __typename?: "Query";
  appConfig: AppConfig;
  getGroup?: Maybe<Group>;
  getGroups: Array<Group>;
  getItem: Item;
  getItems: Array<Item>;
};

export type QueryGetGroupArgs = {
  id: Scalars["Int"]["input"];
};

export type QueryGetItemArgs = {
  id: Scalars["Int"]["input"];
};

export type Subscription = {
  __typename?: "Subscription";
  downloadManagerStats: DownloadManagerStatsDto;
  groupAdded: Group;
  groupStateChanged: GroupStateChangedDto;
  groupStatusChanged: GroupStatusChangedDto;
  itemStatsUpdated: ItemStatsDto;
  itemStatusChanged: ItemStatusChangedDto;
};

export type TargetModel = {
  __typename?: "TargetModel";
  path: Scalars["String"]["output"];
  targetId: Scalars["Int"]["output"];
  targetPath?: Maybe<Scalars["String"]["output"]>;
};

export type WorkerStatsDto = {
  __typename?: "WorkerStatsDto";
  downloadedBytes: Scalars["BigInt"]["output"];
  id: Scalars["String"]["output"];
  speed: Scalars["BigInt"]["output"];
};

export type AppConfigBasicFragment = {
  __typename?: "AppConfig";
  concurrentGroups: number;
  concurrentLargeFiles: number;
  concurrentSmallFiles: number;
  downloaderChunkSize: number;
  downloaderEnabled: boolean;
  host: string;
  port: number;
} & { " $fragmentName"?: "AppConfigBasicFragment" };

export type AppConfigAdvancedFragment = {
  __typename?: "AppConfig";
  downloaderPerformanceMonitoringEnabled: boolean;
  downloaderPerformanceMonitoringSpeed: number;
  downloaderPerformanceMonitoringTime: number;
  uiProgressUpdateInterval: number;
  watcherEnabled: boolean;
} & { " $fragmentName"?: "AppConfigAdvancedFragment" };

export type AppConfigPutioFragment = {
  __typename?: "AppConfig";
  putioAuth: string;
  putioCheckAtStartup: number;
  putioCheckCronSchedule?: string | null;
  putioClientId: number;
  putioClientSecret: string;
  putioWatcherSocket: number;
  putioWebhooksEnabled: number;
} & { " $fragmentName"?: "AppConfigPutioFragment" };

export type AppConfigTargetsFragment = {
  __typename?: "AppConfig";
  downloaderTargets: Array<{
    __typename?: "TargetModel";
    path: string;
    targetId: number;
    targetPath?: string | null;
  }>;
  watcherTargets: Array<{
    __typename?: "TargetModel";
    path: string;
    targetId: number;
    targetPath?: string | null;
  }>;
} & { " $fragmentName"?: "AppConfigTargetsFragment" };

export type GroupBasicInfoFragment = {
  __typename?: "Group";
  id: number;
  name: string;
  status: DownloadStatus;
  state: GroupState;
  addedAt: any;
  saveAt: string;
} & { " $fragmentName"?: "GroupBasicInfoFragment" };

export type GroupWithItemsFragment = ({
  __typename?: "Group";
  items?: Array<{
    __typename?: "Item";
    id: number;
    name: string;
    size: any;
    status: DownloadStatus;
    relativePath: string;
    error?: string | null;
  }> | null;
} & {
  " $fragmentRefs"?: { GroupBasicInfoFragment: GroupBasicInfoFragment };
}) & { " $fragmentName"?: "GroupWithItemsFragment" };

export type ItemBasicInfoFragment = {
  __typename?: "Item";
  id: number;
  name: string;
  size: any;
  status: DownloadStatus;
  relativePath: string;
  groupId: number;
} & { " $fragmentName"?: "ItemBasicInfoFragment" };

export type ItemWithDetailsFragment = ({
  __typename?: "Item";
  crc32?: string | null;
  downloadLink?: string | null;
  error?: string | null;
} & { " $fragmentRefs"?: { ItemBasicInfoFragment: ItemBasicInfoFragment } }) & {
  " $fragmentName"?: "ItemWithDetailsFragment";
};

export type DownloadManagerStatsFragment = {
  __typename?: "DownloadManagerStatsDto";
  lifetimeBytes: string;
  speed: any;
  startedAt: any;
  histogram?: {
    __typename?: "HistogramDto";
    granularity: number;
    since: any;
    until: any;
    values: Array<number>;
  } | null;
} & { " $fragmentName"?: "DownloadManagerStatsFragment" };

export type ItemStatsFragment = {
  __typename?: "ItemStatsDto";
  itemId: number;
  downloadedBytes: any;
  bytesSinceLastEvent: any;
  speed: any;
  startedAt?: any | null;
  restartedAt?: any | null;
  fragments: Array<{
    __typename?: "FragmentDto";
    start: number;
    end: number;
    status: FragmentStatus;
  }>;
  histogram?: {
    __typename?: "HistogramDto";
    granularity: number;
    since: any;
    until: any;
    values: Array<number>;
  } | null;
  workers: Array<{
    __typename?: "WorkerStatsDto";
    id: string;
    downloadedBytes: any;
    speed: any;
  }>;
} & { " $fragmentName"?: "ItemStatsFragment" };

export type CreateDownloadFromPutioMutationVariables = Exact<{
  putioId: Scalars["Int"]["input"];
  saveAt: Scalars["String"]["input"];
}>;

export type CreateDownloadFromPutioMutation = {
  __typename?: "Mutation";
  createDownloadFromPutio: {
    __typename?: "CreatePutioDownloadResultDto";
    success: boolean;
    message?: string | null;
    group?:
      | ({ __typename?: "Group" } & {
          " $fragmentRefs"?: { GroupWithItemsFragment: GroupWithItemsFragment };
        })
      | null;
  };
};

export type GetAppConfigQueryVariables = Exact<{ [key: string]: never }>;

export type GetAppConfigQuery = {
  __typename?: "Query";
  appConfig: { __typename?: "AppConfig" } & {
    " $fragmentRefs"?: {
      AppConfigBasicFragment: AppConfigBasicFragment;
      AppConfigAdvancedFragment: AppConfigAdvancedFragment;
      AppConfigPutioFragment: AppConfigPutioFragment;
      AppConfigTargetsFragment: AppConfigTargetsFragment;
    };
  };
};

export type GetAppConfigBasicQueryVariables = Exact<{ [key: string]: never }>;

export type GetAppConfigBasicQuery = {
  __typename?: "Query";
  appConfig: { __typename?: "AppConfig" } & {
    " $fragmentRefs"?: { AppConfigBasicFragment: AppConfigBasicFragment };
  };
};

export type GetGroupsQueryVariables = Exact<{ [key: string]: never }>;

export type GetGroupsQuery = {
  __typename?: "Query";
  getGroups: Array<
    { __typename?: "Group" } & {
      " $fragmentRefs"?: {
        GroupBasicInfoFragment: GroupBasicInfoFragment;
        GroupWithItemsFragment: GroupWithItemsFragment;
      };
    }
  >;
};

export type GetGroupQueryVariables = Exact<{
  id: Scalars["Int"]["input"];
}>;

export type GetGroupQuery = {
  __typename?: "Query";
  getGroup?:
    | ({ __typename?: "Group" } & {
        " $fragmentRefs"?: {
          GroupBasicInfoFragment: GroupBasicInfoFragment;
          GroupWithItemsFragment: GroupWithItemsFragment;
        };
      })
    | null;
};

export type GetItemsQueryVariables = Exact<{ [key: string]: never }>;

export type GetItemsQuery = {
  __typename?: "Query";
  getItems: Array<
    { __typename?: "Item" } & {
      " $fragmentRefs"?: { ItemWithDetailsFragment: ItemWithDetailsFragment };
    }
  >;
};

export type GetItemQueryVariables = Exact<{
  id: Scalars["Int"]["input"];
}>;

export type GetItemQuery = {
  __typename?: "Query";
  getItem: { __typename?: "Item" } & {
    " $fragmentRefs"?: { ItemWithDetailsFragment: ItemWithDetailsFragment };
  };
};

export type DownloadManagerStatsSubscriptionVariables = Exact<{
  [key: string]: never;
}>;

export type DownloadManagerStatsSubscription = {
  __typename?: "Subscription";
  downloadManagerStats: { __typename?: "DownloadManagerStatsDto" } & {
    " $fragmentRefs"?: {
      DownloadManagerStatsFragment: DownloadManagerStatsFragment;
    };
  };
};

export type GroupAddedSubscriptionVariables = Exact<{ [key: string]: never }>;

export type GroupAddedSubscription = {
  __typename?: "Subscription";
  groupAdded: { __typename?: "Group" } & {
    " $fragmentRefs"?: {
      GroupBasicInfoFragment: GroupBasicInfoFragment;
      GroupWithItemsFragment: GroupWithItemsFragment;
    };
  };
};

export type GroupStateChangedSubscriptionVariables = Exact<{
  [key: string]: never;
}>;

export type GroupStateChangedSubscription = {
  __typename?: "Subscription";
  groupStateChanged: {
    __typename?: "GroupStateChangedDto";
    id: number;
    state: GroupState;
  };
};

export type GroupStatusChangedSubscriptionVariables = Exact<{
  [key: string]: never;
}>;

export type GroupStatusChangedSubscription = {
  __typename?: "Subscription";
  groupStatusChanged: {
    __typename?: "GroupStatusChangedDto";
    id: number;
    status: DownloadStatus;
  };
};

export type ItemStatusChangedSubscriptionVariables = Exact<{
  [key: string]: never;
}>;

export type ItemStatusChangedSubscription = {
  __typename?: "Subscription";
  itemStatusChanged: {
    __typename?: "ItemStatusChangedDto";
    id: number;
    status: DownloadStatus;
  };
};

export type ItemStatsUpdatedSubscriptionVariables = Exact<{
  [key: string]: never;
}>;

export type ItemStatsUpdatedSubscription = {
  __typename?: "Subscription";
  itemStatsUpdated: { __typename?: "ItemStatsDto" } & {
    " $fragmentRefs"?: { ItemStatsFragment: ItemStatsFragment };
  };
};

export const AppConfigBasicFragmentDoc = {
  kind: "Document",
  definitions: [
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "AppConfigBasic" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "AppConfig" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "concurrentGroups" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "concurrentLargeFiles" },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "concurrentSmallFiles" },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "downloaderChunkSize" },
          },
          { kind: "Field", name: { kind: "Name", value: "downloaderEnabled" } },
          { kind: "Field", name: { kind: "Name", value: "host" } },
          { kind: "Field", name: { kind: "Name", value: "port" } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<AppConfigBasicFragment, unknown>;
export const AppConfigAdvancedFragmentDoc = {
  kind: "Document",
  definitions: [
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "AppConfigAdvanced" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "AppConfig" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: {
              kind: "Name",
              value: "downloaderPerformanceMonitoringEnabled",
            },
          },
          {
            kind: "Field",
            name: {
              kind: "Name",
              value: "downloaderPerformanceMonitoringSpeed",
            },
          },
          {
            kind: "Field",
            name: {
              kind: "Name",
              value: "downloaderPerformanceMonitoringTime",
            },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "uiProgressUpdateInterval" },
          },
          { kind: "Field", name: { kind: "Name", value: "watcherEnabled" } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<AppConfigAdvancedFragment, unknown>;
export const AppConfigPutioFragmentDoc = {
  kind: "Document",
  definitions: [
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "AppConfigPutio" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "AppConfig" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "putioAuth" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "putioCheckAtStartup" },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "putioCheckCronSchedule" },
          },
          { kind: "Field", name: { kind: "Name", value: "putioClientId" } },
          { kind: "Field", name: { kind: "Name", value: "putioClientSecret" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "putioWatcherSocket" },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "putioWebhooksEnabled" },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<AppConfigPutioFragment, unknown>;
export const AppConfigTargetsFragmentDoc = {
  kind: "Document",
  definitions: [
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "AppConfigTargets" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "AppConfig" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "downloaderTargets" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "path" } },
                { kind: "Field", name: { kind: "Name", value: "targetId" } },
                { kind: "Field", name: { kind: "Name", value: "targetPath" } },
              ],
            },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "watcherTargets" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "path" } },
                { kind: "Field", name: { kind: "Name", value: "targetId" } },
                { kind: "Field", name: { kind: "Name", value: "targetPath" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<AppConfigTargetsFragment, unknown>;
export const GroupBasicInfoFragmentDoc = {
  kind: "Document",
  definitions: [
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "GroupBasicInfo" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "Group" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "name" } },
          { kind: "Field", name: { kind: "Name", value: "status" } },
          { kind: "Field", name: { kind: "Name", value: "state" } },
          { kind: "Field", name: { kind: "Name", value: "addedAt" } },
          { kind: "Field", name: { kind: "Name", value: "saveAt" } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GroupBasicInfoFragment, unknown>;
export const GroupWithItemsFragmentDoc = {
  kind: "Document",
  definitions: [
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "GroupWithItems" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "Group" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "FragmentSpread",
            name: { kind: "Name", value: "GroupBasicInfo" },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "items" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "size" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "relativePath" },
                },
                { kind: "Field", name: { kind: "Name", value: "error" } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "GroupBasicInfo" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "Group" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "name" } },
          { kind: "Field", name: { kind: "Name", value: "status" } },
          { kind: "Field", name: { kind: "Name", value: "state" } },
          { kind: "Field", name: { kind: "Name", value: "addedAt" } },
          { kind: "Field", name: { kind: "Name", value: "saveAt" } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GroupWithItemsFragment, unknown>;
export const ItemBasicInfoFragmentDoc = {
  kind: "Document",
  definitions: [
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "ItemBasicInfo" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "Item" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "name" } },
          { kind: "Field", name: { kind: "Name", value: "size" } },
          { kind: "Field", name: { kind: "Name", value: "status" } },
          { kind: "Field", name: { kind: "Name", value: "relativePath" } },
          { kind: "Field", name: { kind: "Name", value: "groupId" } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ItemBasicInfoFragment, unknown>;
export const ItemWithDetailsFragmentDoc = {
  kind: "Document",
  definitions: [
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "ItemWithDetails" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "Item" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "FragmentSpread",
            name: { kind: "Name", value: "ItemBasicInfo" },
          },
          { kind: "Field", name: { kind: "Name", value: "crc32" } },
          { kind: "Field", name: { kind: "Name", value: "downloadLink" } },
          { kind: "Field", name: { kind: "Name", value: "error" } },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "ItemBasicInfo" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "Item" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "name" } },
          { kind: "Field", name: { kind: "Name", value: "size" } },
          { kind: "Field", name: { kind: "Name", value: "status" } },
          { kind: "Field", name: { kind: "Name", value: "relativePath" } },
          { kind: "Field", name: { kind: "Name", value: "groupId" } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ItemWithDetailsFragment, unknown>;
export const DownloadManagerStatsFragmentDoc = {
  kind: "Document",
  definitions: [
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "DownloadManagerStats" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "DownloadManagerStatsDto" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "lifetimeBytes" } },
          { kind: "Field", name: { kind: "Name", value: "speed" } },
          { kind: "Field", name: { kind: "Name", value: "startedAt" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "histogram" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "granularity" } },
                { kind: "Field", name: { kind: "Name", value: "since" } },
                { kind: "Field", name: { kind: "Name", value: "until" } },
                { kind: "Field", name: { kind: "Name", value: "values" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<DownloadManagerStatsFragment, unknown>;
export const ItemStatsFragmentDoc = {
  kind: "Document",
  definitions: [
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "ItemStats" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "ItemStatsDto" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "itemId" } },
          { kind: "Field", name: { kind: "Name", value: "downloadedBytes" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "bytesSinceLastEvent" },
          },
          { kind: "Field", name: { kind: "Name", value: "speed" } },
          { kind: "Field", name: { kind: "Name", value: "startedAt" } },
          { kind: "Field", name: { kind: "Name", value: "restartedAt" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "fragments" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "start" } },
                { kind: "Field", name: { kind: "Name", value: "end" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
              ],
            },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "histogram" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "granularity" } },
                { kind: "Field", name: { kind: "Name", value: "since" } },
                { kind: "Field", name: { kind: "Name", value: "until" } },
                { kind: "Field", name: { kind: "Name", value: "values" } },
              ],
            },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "workers" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "downloadedBytes" },
                },
                { kind: "Field", name: { kind: "Name", value: "speed" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ItemStatsFragment, unknown>;
export const CreateDownloadFromPutioDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "CreateDownloadFromPutio" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "putioId" },
          },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: {
            kind: "Variable",
            name: { kind: "Name", value: "saveAt" },
          },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "String" },
            },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "createDownloadFromPutio" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "putioId" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "putioId" },
                },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "saveAt" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "saveAt" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "success" } },
                { kind: "Field", name: { kind: "Name", value: "message" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "group" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      {
                        kind: "FragmentSpread",
                        name: { kind: "Name", value: "GroupWithItems" },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "GroupBasicInfo" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "Group" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "name" } },
          { kind: "Field", name: { kind: "Name", value: "status" } },
          { kind: "Field", name: { kind: "Name", value: "state" } },
          { kind: "Field", name: { kind: "Name", value: "addedAt" } },
          { kind: "Field", name: { kind: "Name", value: "saveAt" } },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "GroupWithItems" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "Group" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "FragmentSpread",
            name: { kind: "Name", value: "GroupBasicInfo" },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "items" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "size" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "relativePath" },
                },
                { kind: "Field", name: { kind: "Name", value: "error" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  CreateDownloadFromPutioMutation,
  CreateDownloadFromPutioMutationVariables
>;
export const GetAppConfigDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "GetAppConfig" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "appConfig" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "FragmentSpread",
                  name: { kind: "Name", value: "AppConfigBasic" },
                },
                {
                  kind: "FragmentSpread",
                  name: { kind: "Name", value: "AppConfigAdvanced" },
                },
                {
                  kind: "FragmentSpread",
                  name: { kind: "Name", value: "AppConfigPutio" },
                },
                {
                  kind: "FragmentSpread",
                  name: { kind: "Name", value: "AppConfigTargets" },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "AppConfigBasic" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "AppConfig" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "concurrentGroups" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "concurrentLargeFiles" },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "concurrentSmallFiles" },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "downloaderChunkSize" },
          },
          { kind: "Field", name: { kind: "Name", value: "downloaderEnabled" } },
          { kind: "Field", name: { kind: "Name", value: "host" } },
          { kind: "Field", name: { kind: "Name", value: "port" } },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "AppConfigAdvanced" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "AppConfig" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: {
              kind: "Name",
              value: "downloaderPerformanceMonitoringEnabled",
            },
          },
          {
            kind: "Field",
            name: {
              kind: "Name",
              value: "downloaderPerformanceMonitoringSpeed",
            },
          },
          {
            kind: "Field",
            name: {
              kind: "Name",
              value: "downloaderPerformanceMonitoringTime",
            },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "uiProgressUpdateInterval" },
          },
          { kind: "Field", name: { kind: "Name", value: "watcherEnabled" } },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "AppConfigPutio" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "AppConfig" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "putioAuth" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "putioCheckAtStartup" },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "putioCheckCronSchedule" },
          },
          { kind: "Field", name: { kind: "Name", value: "putioClientId" } },
          { kind: "Field", name: { kind: "Name", value: "putioClientSecret" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "putioWatcherSocket" },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "putioWebhooksEnabled" },
          },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "AppConfigTargets" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "AppConfig" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "downloaderTargets" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "path" } },
                { kind: "Field", name: { kind: "Name", value: "targetId" } },
                { kind: "Field", name: { kind: "Name", value: "targetPath" } },
              ],
            },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "watcherTargets" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "path" } },
                { kind: "Field", name: { kind: "Name", value: "targetId" } },
                { kind: "Field", name: { kind: "Name", value: "targetPath" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetAppConfigQuery, GetAppConfigQueryVariables>;
export const GetAppConfigBasicDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "GetAppConfigBasic" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "appConfig" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "FragmentSpread",
                  name: { kind: "Name", value: "AppConfigBasic" },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "AppConfigBasic" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "AppConfig" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "concurrentGroups" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "concurrentLargeFiles" },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "concurrentSmallFiles" },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "downloaderChunkSize" },
          },
          { kind: "Field", name: { kind: "Name", value: "downloaderEnabled" } },
          { kind: "Field", name: { kind: "Name", value: "host" } },
          { kind: "Field", name: { kind: "Name", value: "port" } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetAppConfigBasicQuery,
  GetAppConfigBasicQueryVariables
>;
export const GetGroupsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "GetGroups" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "getGroups" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "FragmentSpread",
                  name: { kind: "Name", value: "GroupBasicInfo" },
                },
                {
                  kind: "FragmentSpread",
                  name: { kind: "Name", value: "GroupWithItems" },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "GroupBasicInfo" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "Group" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "name" } },
          { kind: "Field", name: { kind: "Name", value: "status" } },
          { kind: "Field", name: { kind: "Name", value: "state" } },
          { kind: "Field", name: { kind: "Name", value: "addedAt" } },
          { kind: "Field", name: { kind: "Name", value: "saveAt" } },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "GroupWithItems" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "Group" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "FragmentSpread",
            name: { kind: "Name", value: "GroupBasicInfo" },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "items" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "size" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "relativePath" },
                },
                { kind: "Field", name: { kind: "Name", value: "error" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetGroupsQuery, GetGroupsQueryVariables>;
export const GetGroupDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "GetGroup" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "getGroup" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "id" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "FragmentSpread",
                  name: { kind: "Name", value: "GroupBasicInfo" },
                },
                {
                  kind: "FragmentSpread",
                  name: { kind: "Name", value: "GroupWithItems" },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "GroupBasicInfo" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "Group" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "name" } },
          { kind: "Field", name: { kind: "Name", value: "status" } },
          { kind: "Field", name: { kind: "Name", value: "state" } },
          { kind: "Field", name: { kind: "Name", value: "addedAt" } },
          { kind: "Field", name: { kind: "Name", value: "saveAt" } },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "GroupWithItems" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "Group" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "FragmentSpread",
            name: { kind: "Name", value: "GroupBasicInfo" },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "items" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "size" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "relativePath" },
                },
                { kind: "Field", name: { kind: "Name", value: "error" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetGroupQuery, GetGroupQueryVariables>;
export const GetItemsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "GetItems" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "getItems" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "FragmentSpread",
                  name: { kind: "Name", value: "ItemWithDetails" },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "ItemBasicInfo" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "Item" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "name" } },
          { kind: "Field", name: { kind: "Name", value: "size" } },
          { kind: "Field", name: { kind: "Name", value: "status" } },
          { kind: "Field", name: { kind: "Name", value: "relativePath" } },
          { kind: "Field", name: { kind: "Name", value: "groupId" } },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "ItemWithDetails" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "Item" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "FragmentSpread",
            name: { kind: "Name", value: "ItemBasicInfo" },
          },
          { kind: "Field", name: { kind: "Name", value: "crc32" } },
          { kind: "Field", name: { kind: "Name", value: "downloadLink" } },
          { kind: "Field", name: { kind: "Name", value: "error" } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetItemsQuery, GetItemsQueryVariables>;
export const GetItemDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "GetItem" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "getItem" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: {
                  kind: "Variable",
                  name: { kind: "Name", value: "id" },
                },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "FragmentSpread",
                  name: { kind: "Name", value: "ItemWithDetails" },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "ItemBasicInfo" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "Item" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "name" } },
          { kind: "Field", name: { kind: "Name", value: "size" } },
          { kind: "Field", name: { kind: "Name", value: "status" } },
          { kind: "Field", name: { kind: "Name", value: "relativePath" } },
          { kind: "Field", name: { kind: "Name", value: "groupId" } },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "ItemWithDetails" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "Item" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "FragmentSpread",
            name: { kind: "Name", value: "ItemBasicInfo" },
          },
          { kind: "Field", name: { kind: "Name", value: "crc32" } },
          { kind: "Field", name: { kind: "Name", value: "downloadLink" } },
          { kind: "Field", name: { kind: "Name", value: "error" } },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetItemQuery, GetItemQueryVariables>;
export const DownloadManagerStatsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "subscription",
      name: { kind: "Name", value: "DownloadManagerStats" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "downloadManagerStats" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "FragmentSpread",
                  name: { kind: "Name", value: "DownloadManagerStats" },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "DownloadManagerStats" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "DownloadManagerStatsDto" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "lifetimeBytes" } },
          { kind: "Field", name: { kind: "Name", value: "speed" } },
          { kind: "Field", name: { kind: "Name", value: "startedAt" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "histogram" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "granularity" } },
                { kind: "Field", name: { kind: "Name", value: "since" } },
                { kind: "Field", name: { kind: "Name", value: "until" } },
                { kind: "Field", name: { kind: "Name", value: "values" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  DownloadManagerStatsSubscription,
  DownloadManagerStatsSubscriptionVariables
>;
export const GroupAddedDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "subscription",
      name: { kind: "Name", value: "GroupAdded" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "groupAdded" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "FragmentSpread",
                  name: { kind: "Name", value: "GroupBasicInfo" },
                },
                {
                  kind: "FragmentSpread",
                  name: { kind: "Name", value: "GroupWithItems" },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "GroupBasicInfo" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "Group" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "name" } },
          { kind: "Field", name: { kind: "Name", value: "status" } },
          { kind: "Field", name: { kind: "Name", value: "state" } },
          { kind: "Field", name: { kind: "Name", value: "addedAt" } },
          { kind: "Field", name: { kind: "Name", value: "saveAt" } },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "GroupWithItems" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "Group" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "FragmentSpread",
            name: { kind: "Name", value: "GroupBasicInfo" },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "items" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "size" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "relativePath" },
                },
                { kind: "Field", name: { kind: "Name", value: "error" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GroupAddedSubscription,
  GroupAddedSubscriptionVariables
>;
export const GroupStateChangedDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "subscription",
      name: { kind: "Name", value: "GroupStateChanged" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "groupStateChanged" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "state" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GroupStateChangedSubscription,
  GroupStateChangedSubscriptionVariables
>;
export const GroupStatusChangedDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "subscription",
      name: { kind: "Name", value: "GroupStatusChanged" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "groupStatusChanged" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GroupStatusChangedSubscription,
  GroupStatusChangedSubscriptionVariables
>;
export const ItemStatusChangedDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "subscription",
      name: { kind: "Name", value: "ItemStatusChanged" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "itemStatusChanged" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  ItemStatusChangedSubscription,
  ItemStatusChangedSubscriptionVariables
>;
export const ItemStatsUpdatedDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "subscription",
      name: { kind: "Name", value: "ItemStatsUpdated" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "itemStatsUpdated" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "FragmentSpread",
                  name: { kind: "Name", value: "ItemStats" },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "ItemStats" },
      typeCondition: {
        kind: "NamedType",
        name: { kind: "Name", value: "ItemStatsDto" },
      },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "itemId" } },
          { kind: "Field", name: { kind: "Name", value: "downloadedBytes" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "bytesSinceLastEvent" },
          },
          { kind: "Field", name: { kind: "Name", value: "speed" } },
          { kind: "Field", name: { kind: "Name", value: "startedAt" } },
          { kind: "Field", name: { kind: "Name", value: "restartedAt" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "fragments" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "start" } },
                { kind: "Field", name: { kind: "Name", value: "end" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
              ],
            },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "histogram" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "granularity" } },
                { kind: "Field", name: { kind: "Name", value: "since" } },
                { kind: "Field", name: { kind: "Name", value: "until" } },
                { kind: "Field", name: { kind: "Name", value: "values" } },
              ],
            },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "workers" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "downloadedBytes" },
                },
                { kind: "Field", name: { kind: "Name", value: "speed" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  ItemStatsUpdatedSubscription,
  ItemStatsUpdatedSubscriptionVariables
>;
