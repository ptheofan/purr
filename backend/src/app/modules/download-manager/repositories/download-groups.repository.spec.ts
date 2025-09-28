import { Test, TestingModule } from '@nestjs/testing';
import { DownloadGroupsRepository } from './download-groups.repository';
import { Group } from '../entities';
import { DownloadStatus, GroupState } from '../enums';

describe('DownloadGroupsRepository', () => {
  let repository: DownloadGroupsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DownloadGroupsRepository],
    }).compile();

    repository = module.get<DownloadGroupsRepository>(DownloadGroupsRepository);
  });

  afterEach(async () => {
    // Clean up after each test
    await repository.removeAll();
  });

  describe('Repository Operations', () => {
    it('should be defined', () => {
      expect(repository).toBeDefined();
    });

    it('should add a group', async () => {
      const group: Group = {
        id: 1,
        name: 'Test Group',
        addedAt: new Date(),
        saveAt: '/test/path',
        status: DownloadStatus.Pending,
        state: GroupState.Initializing,
      };

      await repository.add(group);
      const result = await repository.getById(1);

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(result?.name).toBe('Test Group');
      expect(result?.status).toBe(DownloadStatus.Pending);
      expect(result?.state).toBe(GroupState.Initializing);
    });

    it('should return a deep copy of the group', async () => {
      const originalDate = new Date('2023-01-01T00:00:00Z');
      const group: Group = {
        id: 1,
        name: 'Test Group',
        addedAt: originalDate,
        saveAt: '/test/path',
        status: DownloadStatus.Pending,
        state: GroupState.Initializing,
      };

      await repository.add(group);
      const result = await repository.getById(1);

      expect(result).toBeDefined();
      expect(result?.addedAt).not.toBe(originalDate);
      expect(result?.addedAt.getTime()).toBe(originalDate.getTime());
    });

    it('should update an existing group', async () => {
      const group: Group = {
        id: 1,
        name: 'Test Group',
        addedAt: new Date(),
        saveAt: '/test/path',
        status: DownloadStatus.Pending,
        state: GroupState.Initializing,
      };

      await repository.add(group);
      
      const updateResult = await repository.update(1, { 
        status: DownloadStatus.Downloading,
        state: GroupState.Ready 
      });
      
      expect(updateResult).toBe(true);
      
      const updatedGroup = await repository.getById(1);
      expect(updatedGroup?.status).toBe(DownloadStatus.Downloading);
      expect(updatedGroup?.state).toBe(GroupState.Ready);
      expect(updatedGroup?.name).toBe('Test Group'); // Should remain unchanged
    });

    it('should return false when updating non-existent group', async () => {
      const result = await repository.update(999, { status: DownloadStatus.Downloading });
      expect(result).toBe(false);
    });

    it('should remove a group', async () => {
      const group: Group = {
        id: 1,
        name: 'Test Group',
        addedAt: new Date(),
        saveAt: '/test/path',
        status: DownloadStatus.Pending,
        state: GroupState.Initializing,
      };

      await repository.add(group);
      
      const removeResult = await repository.remove(1);
      expect(removeResult).toBe(true);
      
      const result = await repository.getById(1);
      expect(result).toBeUndefined();
    });

    it('should return false when removing non-existent group', async () => {
      const result = await repository.remove(999);
      expect(result).toBe(false);
    });

    it('should get all groups', async () => {
      const groups: Group[] = [
        {
          id: 1,
          name: 'Group 1',
          addedAt: new Date(),
          saveAt: '/test/path1',
          status: DownloadStatus.Pending,
          state: GroupState.Initializing,
        },
        {
          id: 2,
          name: 'Group 2',
          addedAt: new Date(),
          saveAt: '/test/path2',
          status: DownloadStatus.Downloading,
          state: GroupState.Ready,
        },
      ];

      await repository.addMany(groups);
      const result = await repository.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it('should filter groups by predicate', async () => {
      const groups: Group[] = [
        {
          id: 1,
          name: 'Group 1',
          addedAt: new Date(),
          saveAt: '/test/path1',
          status: DownloadStatus.Pending,
          state: GroupState.Initializing,
        },
        {
          id: 2,
          name: 'Group 2',
          addedAt: new Date(),
          saveAt: '/test/path2',
          status: DownloadStatus.Downloading,
          state: GroupState.Ready,
        },
        {
          id: 3,
          name: 'Group 3',
          addedAt: new Date(),
          saveAt: '/test/path3',
          status: DownloadStatus.Pending,
          state: GroupState.Ready,
        },
      ];

      await repository.addMany(groups);
      
      const pendingGroups = await repository.filter(g => g.status === DownloadStatus.Pending);
      expect(pendingGroups).toHaveLength(2);
      expect(pendingGroups.every(g => g.status === DownloadStatus.Pending)).toBe(true);

      const readyGroups = await repository.filter(g => g.state === GroupState.Ready);
      expect(readyGroups).toHaveLength(2);
      expect(readyGroups.every(g => g.state === GroupState.Ready)).toBe(true);
    });

    it('should find a group by predicate', async () => {
      const group: Group = {
        id: 1,
        name: 'Test Group',
        addedAt: new Date(),
        saveAt: '/test/path',
        status: DownloadStatus.Pending,
        state: GroupState.Initializing,
      };

      await repository.add(group);
      
      const found = await repository.find(g => g.name === 'Test Group');
      expect(found).toBeDefined();
      expect(found?.id).toBe(1);

      const notFound = await repository.find(g => g.name === 'Non-existent');
      expect(notFound).toBeUndefined();
    });

    it('should check if group exists', async () => {
      const group: Group = {
        id: 1,
        name: 'Test Group',
        addedAt: new Date(),
        saveAt: '/test/path',
        status: DownloadStatus.Pending,
        state: GroupState.Initializing,
      };

      await repository.add(group);
      
      expect(await repository.has(1)).toBe(true);
      expect(await repository.has(999)).toBe(false);
    });

    it('should return correct size', async () => {
      expect(await repository.size()).toBe(0);
      expect(await repository.isEmpty()).toBe(true);

      const group: Group = {
        id: 1,
        name: 'Test Group',
        addedAt: new Date(),
        saveAt: '/test/path',
        status: DownloadStatus.Pending,
        state: GroupState.Initializing,
      };

      await repository.add(group);
      
      expect(await repository.size()).toBe(1);
      expect(await repository.isEmpty()).toBe(false);
    });

    it('should remove all groups', async () => {
      const groups: Group[] = [
        {
          id: 1,
          name: 'Group 1',
          addedAt: new Date(),
          saveAt: '/test/path1',
          status: DownloadStatus.Pending,
          state: GroupState.Initializing,
        },
        {
          id: 2,
          name: 'Group 2',
          addedAt: new Date(),
          saveAt: '/test/path2',
          status: DownloadStatus.Downloading,
          state: GroupState.Ready,
        },
      ];

      await repository.addMany(groups);
      expect(await repository.size()).toBe(2);

      await repository.removeAll();
      expect(await repository.size()).toBe(0);
      expect(await repository.isEmpty()).toBe(true);
    });
  });

  describe('getSortOrderOf', () => {
    it('should return correct sort order for existing group', async () => {
      const groups: Group[] = [
        {
          id: 1,
          name: 'First Group',
          addedAt: new Date(),
          saveAt: '/test/path1',
          status: DownloadStatus.Pending,
          state: GroupState.Initializing,
        },
        {
          id: 2,
          name: 'Second Group',
          addedAt: new Date(),
          saveAt: '/test/path2',
          status: DownloadStatus.Pending,
          state: GroupState.Initializing,
        },
        {
          id: 3,
          name: 'Third Group',
          addedAt: new Date(),
          saveAt: '/test/path3',
          status: DownloadStatus.Pending,
          state: GroupState.Initializing,
        },
      ];

      await repository.addMany(groups);

      expect(await repository.getSortOrderOf(1)).toBe(0);
      expect(await repository.getSortOrderOf(2)).toBe(1);
      expect(await repository.getSortOrderOf(3)).toBe(2);
    });

    it('should return -1 for non-existent group', async () => {
      expect(await repository.getSortOrderOf(999)).toBe(-1);
    });

    it('should maintain correct sort order after removal', async () => {
      const groups: Group[] = [
        {
          id: 1,
          name: 'First Group',
          addedAt: new Date(),
          saveAt: '/test/path1',
          status: DownloadStatus.Pending,
          state: GroupState.Initializing,
        },
        {
          id: 2,
          name: 'Second Group',
          addedAt: new Date(),
          saveAt: '/test/path2',
          status: DownloadStatus.Pending,
          state: GroupState.Initializing,
        },
        {
          id: 3,
          name: 'Third Group',
          addedAt: new Date(),
          saveAt: '/test/path3',
          status: DownloadStatus.Pending,
          state: GroupState.Initializing,
        },
      ];

      await repository.addMany(groups);
      
      // Remove the middle group
      await repository.remove(2);
      
      expect(await repository.getSortOrderOf(1)).toBe(0);
      expect(await repository.getSortOrderOf(2)).toBe(-1); // Removed
      expect(await repository.getSortOrderOf(3)).toBe(1); // Moved up
    });

    it('should be thread-safe', async () => {
      const groups: Group[] = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Group ${i + 1}`,
        addedAt: new Date(),
        saveAt: `/test/path${i + 1}`,
        status: DownloadStatus.Pending,
        state: GroupState.Initializing,
      }));

      // Add groups concurrently
      await Promise.all(groups.map(group => repository.add(group)));

      // Check sort orders concurrently
      const sortOrderPromises = groups.map(group => repository.getSortOrderOf(group.id));
      const sortOrders = await Promise.all(sortOrderPromises);

      // Verify all groups have correct sort orders
      sortOrders.forEach((order, index) => {
        expect(order).toBe(index);
      });
    });
  });

  describe('Bulk Operations', () => {
    it('should perform bulk update', async () => {
      const groups: Group[] = [
        {
          id: 1,
          name: 'Group 1',
          addedAt: new Date(),
          saveAt: '/test/path1',
          status: DownloadStatus.Pending,
          state: GroupState.Initializing,
        },
        {
          id: 2,
          name: 'Group 2',
          addedAt: new Date(),
          saveAt: '/test/path2',
          status: DownloadStatus.Pending,
          state: GroupState.Initializing,
        },
        {
          id: 3,
          name: 'Group 3',
          addedAt: new Date(),
          saveAt: '/test/path3',
          status: DownloadStatus.Pending,
          state: GroupState.Initializing,
        },
      ];

      await repository.addMany(groups);

      const updates = [
        { id: 1, update: { status: DownloadStatus.Downloading } },
        { id: 2, update: { state: GroupState.Ready } },
        { id: 999, update: { status: DownloadStatus.Completed } }, // Non-existent
      ];

      const updatedCount = await repository.bulkUpdate(updates);
      expect(updatedCount).toBe(2);

      const updatedGroup1 = await repository.getById(1);
      const updatedGroup2 = await repository.getById(2);
      const updatedGroup3 = await repository.getById(3);

      expect(updatedGroup1?.status).toBe(DownloadStatus.Downloading);
      expect(updatedGroup2?.state).toBe(GroupState.Ready);
      expect(updatedGroup3?.status).toBe(DownloadStatus.Pending); // Unchanged
    });

    it('should perform bulk remove', async () => {
      const groups: Group[] = [
        {
          id: 1,
          name: 'Group 1',
          addedAt: new Date(),
          saveAt: '/test/path1',
          status: DownloadStatus.Pending,
          state: GroupState.Initializing,
        },
        {
          id: 2,
          name: 'Group 2',
          addedAt: new Date(),
          saveAt: '/test/path2',
          status: DownloadStatus.Pending,
          state: GroupState.Initializing,
        },
        {
          id: 3,
          name: 'Group 3',
          addedAt: new Date(),
          saveAt: '/test/path3',
          status: DownloadStatus.Pending,
          state: GroupState.Initializing,
        },
      ];

      await repository.addMany(groups);

      const removedCount = await repository.bulkRemove([1, 3, 999]); // 999 doesn't exist
      expect(removedCount).toBe(2);

      expect(await repository.has(1)).toBe(false);
      expect(await repository.has(2)).toBe(true);
      expect(await repository.has(3)).toBe(false);
    });

    it('should remove many by predicate', async () => {
      const groups: Group[] = [
        {
          id: 1,
          name: 'Group 1',
          addedAt: new Date(),
          saveAt: '/test/path1',
          status: DownloadStatus.Pending,
          state: GroupState.Initializing,
        },
        {
          id: 2,
          name: 'Group 2',
          addedAt: new Date(),
          saveAt: '/test/path2',
          status: DownloadStatus.Downloading,
          state: GroupState.Ready,
        },
        {
          id: 3,
          name: 'Group 3',
          addedAt: new Date(),
          saveAt: '/test/path3',
          status: DownloadStatus.Pending,
          state: GroupState.Initializing,
        },
      ];

      await repository.addMany(groups);

      const removedCount = await repository.removeMany(g => g.status === DownloadStatus.Pending);
      expect(removedCount).toBe(2);

      const remaining = await repository.getAll();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty repository operations', async () => {
      expect(await repository.getAll()).toEqual([]);
      expect(await repository.getById(1)).toBeUndefined();
      expect(await repository.find(g => g.id === 1)).toBeUndefined();
      expect(await repository.filter(g => g.status === DownloadStatus.Pending)).toEqual([]);
      expect(await repository.has(1)).toBe(false);
      expect(await repository.size()).toBe(0);
      expect(await repository.isEmpty()).toBe(true);
    });

    it('should handle duplicate additions (update existing)', async () => {
      const group1: Group = {
        id: 1,
        name: 'Original Group',
        addedAt: new Date(),
        saveAt: '/test/path',
        status: DownloadStatus.Pending,
        state: GroupState.Initializing,
      };

      const group2: Group = {
        id: 1, // Same ID
        name: 'Updated Group',
        addedAt: new Date(),
        saveAt: '/test/path',
        status: DownloadStatus.Downloading,
        state: GroupState.Ready,
      };

      await repository.add(group1);
      await repository.add(group2);

      const result = await repository.getById(1);
      expect(result?.name).toBe('Updated Group');
      expect(result?.status).toBe(DownloadStatus.Downloading);
      expect(result?.state).toBe(GroupState.Ready);
      expect(await repository.size()).toBe(1);
    });

    it('should maintain immutability of returned objects', async () => {
      const group: Group = {
        id: 1,
        name: 'Test Group',
        addedAt: new Date(),
        saveAt: '/test/path',
        status: DownloadStatus.Pending,
        state: GroupState.Initializing,
      };

      await repository.add(group);
      const result1 = await repository.getById(1);
      const result2 = await repository.getById(1);

      // Modify the returned object
      if (result1) {
        result1.name = 'Modified Name';
        result1.status = DownloadStatus.Downloading;
      }

      // Second retrieval should be unaffected
      expect(result2?.name).toBe('Test Group');
      expect(result2?.status).toBe(DownloadStatus.Pending);
    });
  });
});
