interface DownloadItem {
  id: number;
  name: string;
  relativePath: string;
  size: string;
  status: string;
  error?: string | null;
}

// Utility function to extract parent directory from relativePath
export const getParentDirectory = (relativePath: string): string => {
  const pathParts = relativePath.split('/');
  if (pathParts.length <= 1) {
    return 'Root';
  }
  return pathParts[0] || 'Root';
};

// Utility function to group items by parent directory
export const groupItemsByParent = (items: DownloadItem[]) => {
  const grouped = items.reduce((acc, item) => {
    const parent = getParentDirectory(item.relativePath);
    if (!acc[parent]) {
      acc[parent] = [];
    }
    acc[parent].push(item);
    return acc;
  }, {} as Record<string, DownloadItem[]>);

  return grouped;
};