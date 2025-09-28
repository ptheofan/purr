interface DownloadItem {
    id: number;
    name: string;
    relativePath: string;
    size: any;
    status: any;
    error?: string | null;
}
interface ItemListProps {
    items: DownloadItem[];
}
declare const ItemList: ({ items }: ItemListProps) => import("react/jsx-runtime").JSX.Element;
export default ItemList;
