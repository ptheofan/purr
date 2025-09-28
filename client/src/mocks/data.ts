import { 
  Group, 
  Item, 
  DownloadManagerStatsDto, 
  HistogramDto,
  DownloadStatus,
  FragmentStatus,
  ItemStatsDto,
  FragmentDto,
  WorkerDto
} from '../__generated__/graphql';

// Mock data generators
export const generateMockGroups = (): Group[] => [
  {
    __typename: 'Group',
    id: 1,
    name: 'The Matrix Collection',
    status: 'Downloading' as DownloadStatus,
    state: 'active',
    addedAt: new Date('2024-01-15T10:30:00Z').toISOString(),
    saveAt: '/downloads/movies',
    items: [
      {
        __typename: 'Item',
        id: 1,
        name: 'The Matrix (1999).mkv',
        size: '8589934592', // 8GB
        status: 'Completed' as DownloadStatus,
        relativePath: 'The Matrix (1999).mkv',
        error: null,
        crc32: 'A1B2C3D4',
        downloadLink: 'https://example.com/matrix.mkv',
        groupId: 1
      },
      {
        __typename: 'Item',
        id: 2,
        name: 'The Matrix Reloaded (2003).mkv',
        size: '10737418240', // 10GB
        status: 'Downloading' as DownloadStatus,
        relativePath: 'The Matrix Reloaded (2003).mkv',
        error: null,
        crc32: null,
        downloadLink: 'https://example.com/matrix2.mkv',
        groupId: 1
      },
      {
        __typename: 'Item',
        id: 3,
        name: 'The Matrix Revolutions (2003).mkv',
        size: '10737418240', // 10GB
        status: 'Pending' as DownloadStatus,
        relativePath: 'The Matrix Revolutions (2003).mkv',
        error: null,
        crc32: null,
        downloadLink: 'https://example.com/matrix3.mkv',
        groupId: 1
      }
    ]
  },
  {
    __typename: 'Group',
    id: 2,
    name: 'Game of Thrones S01',
    status: 'Completed' as DownloadStatus,
    state: 'completed',
    addedAt: new Date('2024-01-10T14:20:00Z').toISOString(),
    saveAt: '/downloads/series',
    items: [
      {
        __typename: 'Item',
        id: 4,
        name: 'S01E01 - Winter Is Coming.mkv',
        size: '2147483648', // 2GB
        status: 'Completed' as DownloadStatus,
        relativePath: 'S01E01 - Winter Is Coming.mkv',
        error: null,
        crc32: 'E5F6G7H8',
        downloadLink: 'https://example.com/got-s01e01.mkv',
        groupId: 2
      },
      {
        __typename: 'Item',
        id: 5,
        name: 'S01E02 - The Kingsroad.mkv',
        size: '2147483648', // 2GB
        status: 'Completed' as DownloadStatus,
        relativePath: 'S01E02 - The Kingsroad.mkv',
        error: null,
        crc32: 'I9J0K1L2',
        downloadLink: 'https://example.com/got-s01e02.mkv',
        groupId: 2
      }
    ]
  },
  {
    __typename: 'Group',
    id: 3,
    name: 'Ubuntu 24.04 LTS',
    status: 'Error' as DownloadStatus,
    state: 'error',
    addedAt: new Date('2024-01-20T09:15:00Z').toISOString(),
    saveAt: '/downloads/software',
    items: [
      {
        __typename: 'Item',
        id: 6,
        name: 'ubuntu-24.04-desktop-amd64.iso',
        size: '5368709120', // 5GB
        status: 'Error' as DownloadStatus,
        relativePath: 'ubuntu-24.04-desktop-amd64.iso',
        error: 'Connection timeout after 3 retries',
        crc32: null,
        downloadLink: 'https://releases.ubuntu.com/24.04/ubuntu-24.04-desktop-amd64.iso',
        groupId: 3
      }
    ]
  },
  {
    __typename: 'Group',
    id: 4,
    name: 'Music Collection - Jazz',
    status: 'Paused' as DownloadStatus,
    state: 'paused',
    addedAt: new Date('2024-01-18T16:45:00Z').toISOString(),
    saveAt: '/downloads/music',
    items: [
      {
        __typename: 'Item',
        id: 7,
        name: 'Miles Davis - Kind of Blue (1959).flac',
        size: '524288000', // 500MB
        status: 'Paused' as DownloadStatus,
        relativePath: 'Miles Davis - Kind of Blue (1959).flac',
        error: null,
        crc32: null,
        downloadLink: 'https://example.com/kind-of-blue.flac',
        groupId: 4
      },
      {
        __typename: 'Item',
        id: 8,
        name: 'John Coltrane - A Love Supreme (1965).flac',
        size: '419430400', // 400MB
        status: 'Pending' as DownloadStatus,
        relativePath: 'John Coltrane - A Love Supreme (1965).flac',
        error: null,
        crc32: null,
        downloadLink: 'https://example.com/love-supreme.flac',
        groupId: 4
      }
    ]
  }
];

export const generateMockDownloadManagerStats = (): DownloadManagerStatsDto => ({
  __typename: 'DownloadManagerStatsDto',
  lifetimeBytes: '1099511627776', // 1TB
  speed: '52428800', // 50MB/s
  startedAt: new Date('2024-01-01T00:00:00Z').toISOString(),
  histogram: {
    __typename: 'HistogramDto',
    granularity: 60, // 1 minute
    since: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    until: new Date().toISOString(),
    values: Array.from({ length: 60 }, (_, i) => Math.floor(Math.random() * 100000000)) // Random speed values
  }
});

export const generateMockItemStats = (itemId: number): ItemStatsDto => ({
  __typename: 'ItemStatsDto',
  itemId,
  downloadedBytes: Math.floor(Math.random() * 1000000000).toString(),
  bytesSinceLastEvent: Math.floor(Math.random() * 10000000).toString(),
  speed: Math.floor(Math.random() * 50000000).toString(),
  startedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
  restartedAt: new Date(Date.now() - Math.random() * 1800000).toISOString(),
  fragments: [
    {
      __typename: 'FragmentDto',
      start: 0,
      end: 1048576, // 1MB
      status: 'finished' as FragmentStatus
    },
    {
      __typename: 'FragmentDto',
      start: 1048576,
      end: 2097152, // 2MB
      status: 'reserved' as FragmentStatus
    },
    {
      __typename: 'FragmentDto',
      start: 2097152,
      end: 3145728, // 3MB
      status: 'pending' as FragmentStatus
    }
  ],
  histogram: {
    __typename: 'HistogramDto',
    granularity: 10, // 10 seconds
    since: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
    until: new Date().toISOString(),
    values: Array.from({ length: 60 }, (_, i) => Math.floor(Math.random() * 10000000))
  },
  workers: [
    {
      __typename: 'WorkerDto',
      id: 1,
      downloadedBytes: Math.floor(Math.random() * 100000000).toString(),
      speed: Math.floor(Math.random() * 25000000).toString()
    },
    {
      __typename: 'WorkerDto',
      id: 2,
      downloadedBytes: Math.floor(Math.random() * 100000000).toString(),
      speed: Math.floor(Math.random() * 25000000).toString()
    }
  ]
});

// Mock data instances
export const mockGroups = generateMockGroups();
export const mockDownloadManagerStats = generateMockDownloadManagerStats();
export const mockItemStats = generateMockItemStats(2); // For item ID 2
