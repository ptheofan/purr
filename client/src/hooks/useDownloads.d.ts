export declare const useDownloadGroups: () => import("@apollo/client").QueryResult<import("../__generated__/graphql").GetGroupsQuery, import("../__generated__/graphql").Exact<{
    [key: string]: never;
}>>;
export declare const useDownloadGroup: (id: number) => import("@apollo/client").QueryResult<import("../__generated__/graphql").GetGroupQuery, import("../__generated__/graphql").Exact<{
    id: number;
}>>;
export declare const useDownloadItems: () => import("@apollo/client").QueryResult<import("../__generated__/graphql").GetItemsQuery, import("../__generated__/graphql").Exact<{
    [key: string]: never;
}>>;
export declare const useDownloadItem: (id: number) => import("@apollo/client").QueryResult<import("../__generated__/graphql").GetItemQuery, import("../__generated__/graphql").Exact<{
    id: number;
}>>;
export declare const useCreateDownloadFromPutio: () => import("@apollo/client").MutationTuple<import("../__generated__/graphql").CreateDownloadFromPutioMutation, import("../__generated__/graphql").Exact<{
    putioId: number;
    saveAt: string;
}>, import("@apollo/client").DefaultContext, import("@apollo/client").ApolloCache<any>>;
export declare const useDownloadManagerStats: () => import("@apollo/client").SubscriptionResult<import("../__generated__/graphql").DownloadManagerStatsSubscription, import("../__generated__/graphql").Exact<{
    [key: string]: never;
}>>;
export declare const useGroupAdded: () => import("@apollo/client").SubscriptionResult<import("../__generated__/graphql").GroupAddedSubscription, import("../__generated__/graphql").Exact<{
    [key: string]: never;
}>>;
export declare const useGroupStatusChanged: () => import("@apollo/client").SubscriptionResult<import("../__generated__/graphql").GroupStatusChangedSubscription, import("../__generated__/graphql").Exact<{
    [key: string]: never;
}>>;
export declare const useItemStatusChanged: () => import("@apollo/client").SubscriptionResult<import("../__generated__/graphql").ItemStatusChangedSubscription, import("../__generated__/graphql").Exact<{
    [key: string]: never;
}>>;
