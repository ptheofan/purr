import { Test, TestingModule } from '@nestjs/testing';
import { GroupMapper } from './group.mapper';
import { Group } from '../entities';
import { GroupDto } from '../dtos';
import { DownloadStatus, GroupState } from '../enums';

describe('GroupMapper', () => {
  let mapper: GroupMapper;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GroupMapper],
    }).compile();

    mapper = module.get<GroupMapper>(GroupMapper);
  });

  describe('entityToDto', () => {
    it('should convert Group entity to GroupDto successfully', () => {
      // Arrange
      const group: Group = {
        id: 123,
        addedAt: new Date('2023-01-01T00:00:00Z'),
        name: 'Test Group',
        saveAt: '/downloads/test',
        status: DownloadStatus.Pending,
        state: GroupState.Initializing,
      };

      // Act
      const result = mapper.entityToDto(group);

      // Assert
      expect(result).toEqual({
        id: 123,
        addedAt: new Date('2023-01-01T00:00:00Z'),
        name: 'Test Group',
        saveAt: '/downloads/test',
        status: DownloadStatus.Pending,
        state: GroupState.Initializing,
      });
      expect(result).toBeInstanceOf(Object);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('addedAt');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('saveAt');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('state');
    });

    it('should handle Group with Ready state', () => {
      // Arrange
      const group: Group = {
        id: 456,
        addedAt: new Date('2023-02-01T12:00:00Z'),
        name: 'Ready Group',
        saveAt: '/downloads/ready',
        status: DownloadStatus.Downloading,
        state: GroupState.Ready,
      };

      // Act
      const result = mapper.entityToDto(group);

      // Assert
      expect(result.state).toBe(GroupState.Ready);
      expect(result.status).toBe(DownloadStatus.Downloading);
    });

    it('should handle Group with Completed status', () => {
      // Arrange
      const group: Group = {
        id: 789,
        addedAt: new Date('2023-03-01T18:30:00Z'),
        name: 'Completed Group',
        saveAt: '/downloads/completed',
        status: DownloadStatus.Completed,
        state: GroupState.Ready,
      };

      // Act
      const result = mapper.entityToDto(group);

      // Assert
      expect(result.status).toBe(DownloadStatus.Completed);
    });

    it('should preserve all primitive values correctly', () => {
      // Arrange
      const testDate = new Date('2023-12-25T15:30:45Z');
      const group: Group = {
        id: 999,
        addedAt: testDate,
        name: 'Special Characters: !@#$%^&*()',
        saveAt: '/very/long/path/with/special/chars',
        status: DownloadStatus.Error,
        state: GroupState.Initializing,
      };

      // Act
      const result = mapper.entityToDto(group);

      // Assert
      expect(result.id).toBe(999);
      expect(result.addedAt).toBe(testDate);
      expect(result.name).toBe('Special Characters: !@#$%^&*()');
      expect(result.saveAt).toBe('/very/long/path/with/special/chars');
      expect(result.status).toBe(DownloadStatus.Error);
      expect(result.state).toBe(GroupState.Initializing);
    });

    it('should throw error when group is null', () => {
      // Act & Assert
      expect(() => mapper.entityToDto(null as unknown as Group)).toThrow(
        'Group entity cannot be null or undefined'
      );
    });

    it('should throw error when group is undefined', () => {
      // Act & Assert
      expect(() => mapper.entityToDto(undefined as unknown as Group)).toThrow(
        'Group entity cannot be null or undefined'
      );
    });

    it('should return a new object (not reference to original)', () => {
      // Arrange
      const group: Group = {
        id: 123,
        addedAt: new Date(),
        name: 'Test Group',
        saveAt: '/downloads/test',
        status: DownloadStatus.Pending,
        state: GroupState.Initializing,
      };

      // Act
      const result = mapper.entityToDto(group);

      // Assert
      expect(result).not.toBe(group);
      expect(result).toEqual(group);
    });
  });
});
