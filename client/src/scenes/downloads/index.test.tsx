import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { GET_GROUPS } from '../../queries';
import Downloads from './index';

// Mock the pretty helper
jest.mock('../../helpers/pretty.helper', () => ({
  prettyBytes: jest.fn((bytes) => `${bytes} bytes`),
}));

// Mock the fragments
jest.mock('../../fragments', () => ({
  GroupBasicInfoFragment: { __typename: 'Group' },
  GroupWithItemsFragment: { __typename: 'Group' },
  DownloadManagerStatsFragment: { __typename: 'DownloadManagerStatsDto' },
}));

// Mock the generated GraphQL types
jest.mock('../../__generated__', () => ({
  getFragmentData: jest.fn((fragment, data) => data),
}));

const mockGroupsData = {
  getGroups: [
    {
      __typename: 'Group',
      id: 1,
      name: 'Test Group',
      status: 'Downloading',
      state: 'Ready',
      addedAt: '2024-01-15T10:30:00Z',
      saveAt: '/downloads/test',
      items: [
        {
          __typename: 'Item',
          id: 1,
          name: 'file1.txt',
          size: '1024',
          status: 'Completed',
          relativePath: 'folder1/file1.txt',
          error: null,
        },
        {
          __typename: 'Item',
          id: 2,
          name: 'file2.txt',
          size: '2048',
          status: 'Downloading',
          relativePath: 'folder1/file2.txt',
          error: null,
        },
        {
          __typename: 'Item',
          id: 3,
          name: 'file3.txt',
          size: '4096',
          status: 'Pending',
          relativePath: 'folder2/file3.txt',
          error: null,
        },
      ],
    },
  ],
};

const mocks = [
  {
    request: {
      query: GET_GROUPS,
    },
    result: {
      data: mockGroupsData,
    },
  },
];

describe('Downloads Component - Grouping by Parent Directory', () => {
  it('should group items by parent directory', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <Downloads />
      </MockedProvider>
    );

    // Wait for the component to load
    await screen.findByText('Test Group');

    // Check that parent directories are shown as accordion headers
    expect(screen.getByText('folder1 (2 items)')).toBeInTheDocument();
    expect(screen.getByText('folder2 (1 items)')).toBeInTheDocument();

    // Check that individual files are displayed
    expect(screen.getByText('file1.txt')).toBeInTheDocument();
    expect(screen.getByText('file2.txt')).toBeInTheDocument();
    expect(screen.getByText('file3.txt')).toBeInTheDocument();
  });

  it('should handle items with no parent directory', async () => {
    const mockDataWithRootItems = {
      getGroups: [
        {
          __typename: 'Group',
          id: 1,
          name: 'Test Group',
          status: 'Downloading',
          state: 'Ready',
          addedAt: '2024-01-15T10:30:00Z',
          saveAt: '/downloads/test',
          items: [
            {
              __typename: 'Item',
              id: 1,
              name: 'rootfile.txt',
              size: '1024',
              status: 'Completed',
              relativePath: 'rootfile.txt',
              error: null,
            },
          ],
        },
      ],
    };

    const mocksWithRoot = [
      {
        request: {
          query: GET_GROUPS,
        },
        result: {
          data: mockDataWithRootItems,
        },
      },
    ];

    render(
      <MockedProvider mocks={mocksWithRoot} addTypename={false}>
        <Downloads />
      </MockedProvider>
    );

    // Wait for the component to load
    await screen.findByText('Test Group');

    // Check that root items are grouped under "Root"
    expect(screen.getByText('Root (1 items)')).toBeInTheDocument();
    expect(screen.getByText('rootfile.txt')).toBeInTheDocument();
  });
});
