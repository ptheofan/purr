interface DownloadItem {
    id: number;
    name: string;
    relativePath: string;
    size: any;
    status: any;
    error?: string | null;
}
interface GroupItemsProps {
    groupedItems: Record<string, DownloadItem[]>;
}
declare const getParentDirectory: (relativePath: string) => string;
declare const groupItemsByParent: (items: DownloadItem[]) => Record<string, DownloadItem[]>;
declare const GroupItems: ({ groupedItems }: GroupItemsProps) => import("react/jsx-runtime").JSX.Element;
export { GroupItems, groupItemsByParent, getParentDirectory };
export default GroupItems;
