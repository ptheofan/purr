import { Repository } from './repository';

class Item {
  id: number;
  name: string;
}

class MockRepository extends Repository<Item, 'id'> {
  protected dataEquals(item: Item, id: Item['id']): boolean {
    return item.id === id;
  }

  protected getKey(item: Item): Item['id'] {
    return item.id;
  }

  protected copyItem(item: Item): Item {
    return { ...item };
  }
}

describe('Repository', () => {
  let repository: Repository<Item, 'id'>;

  beforeEach(() => {
    repository = new MockRepository();
  });

  it('should add an item', async () => {
    await repository.add({ id: 1, name: 'Item 1' });
    expect(await repository.getAll()).toEqual([{ id: 1, name: 'Item 1' }]);
  });

  it('should add multiple items', async () => {
    await repository.addMany([{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }]);
    expect(await repository.getAll()).toEqual([{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }]);
  });

  it('should get item by id', async () => {
    await repository.addMany([{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }]);
    expect(await repository.getById(1)).toEqual({ id: 1, name: 'Item 1' });
    expect(await repository.getById(3)).toBeUndefined();
  });

  it('should check if item exists', async () => {
    await repository.add({ id: 1, name: 'Item 1' });
    expect(await repository.has(1)).toBe(true);
    expect(await repository.has(2)).toBe(false);
  });

  it('should get repository size', async () => {
    expect(await repository.size()).toBe(0);
    expect(await repository.isEmpty()).toBe(true);
    
    await repository.addMany([{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }]);
    expect(await repository.size()).toBe(2);
    expect(await repository.isEmpty()).toBe(false);
  });

  it('should filter items', async () => {
    await repository.addMany([{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }]);
    expect(await repository.filter(item => item.id === 1)).toEqual([{ id: 1, name: 'Item 1' }]);
  });

  it('should find an item', async () => {
    await repository.addMany([{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }]);
    expect(await repository.find(item => item.id === 2)).toEqual({ id: 2, name: 'Item 2' });
  });

  it('should update an item', async () => {
    await repository.add({ id: 1, name: 'Item 1' });
    const result = await repository.update(1, { name: 'Updated Item' });
    expect(result).toBe(true);
    expect(await repository.getAll()).toEqual([{ id: 1, name: 'Updated Item' }]);
  });

  it('should not update an item if it does not exist', async () => {
    const result = await repository.update(1, { name: 'Updated Item' });
    expect(result).toBe(false);
    expect(await repository.getAll()).toEqual([]);
  });

  it('should remove an item', async () => {
    await repository.add({ id: 1, name: 'Item 1' });
    const result = await repository.remove(1);
    expect(result).toBe(true);
    expect(await repository.getAll()).toEqual([]);
  });

  it('should not remove an item if it does not exist', async () => {
    const result = await repository.remove(1);
    expect(result).toBe(false);
    expect(await repository.getAll()).toEqual([]);
  });

  it('should remove multiple items', async () => {
    await repository.addMany([{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }, { id: 3, name: 'Item 3' }]);
    const removedCount = await repository.removeMany(item => item.id === 1 || item.id === 2);
    expect(removedCount).toBe(2);
    expect(await repository.getAll()).toEqual([{ id: 3, name: 'Item 3' }]);
  });

  it('should not remove any items if none match the predicate', async () => {
    await repository.addMany([{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }]);
    const removedCount = await repository.removeMany(item => item.id === 3);
    expect(removedCount).toBe(0);
    expect(await repository.getAll()).toEqual([{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }]);
  });

  it('should remove all items', async () => {
    await repository.addMany([{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }, { id: 3, name: 'Item 3' }]);
    await repository.removeAll();
    expect(await repository.getAll()).toEqual([]);
    expect(await repository.size()).toBe(0);
    expect(await repository.isEmpty()).toBe(true);
  });

  it('should not throw an error when removing all items from an empty repository', async () => {
    await repository.removeAll();
    expect(await repository.getAll()).toEqual([]);
  });

  it('should handle bulk operations', async () => {
    await repository.addMany([{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }, { id: 3, name: 'Item 3' }]);
    
    // Bulk update
    const updateResult = await repository.bulkUpdate([
      { id: 1, update: { name: 'Updated 1' } },
      { id: 2, update: { name: 'Updated 2' } },
      { id: 4, update: { name: 'Non-existent' } }
    ]);
    expect(updateResult).toBe(2);
    expect((await repository.getById(1))?.name).toBe('Updated 1');
    expect((await repository.getById(2))?.name).toBe('Updated 2');
    
    // Bulk remove
    const removeResult = await repository.bulkRemove([1, 3, 5]);
    expect(removeResult).toBe(2);
    expect(await repository.getAll()).toEqual([{ id: 2, name: 'Updated 2' }]);
  });

  it('should handle duplicate adds by updating existing items', async () => {
    await repository.add({ id: 1, name: 'Item 1' });
    await repository.add({ id: 1, name: 'Updated Item 1' });
    expect(await repository.size()).toBe(1);
    expect((await repository.getById(1))?.name).toBe('Updated Item 1');
  });

  it('should store copies of objects to prevent external mutations', async () => {
    const originalItem = { id: 1, name: 'Item 1' };
    await repository.add(originalItem);
    
    // Modify the original object
    originalItem.name = 'Modified Name';
    
    // Repository should still have the original value
    expect((await repository.getById(1))?.name).toBe('Item 1');
    expect((await repository.getAll())[0].name).toBe('Item 1');
  });

  it('should return copies from getAll to prevent external mutations', async () => {
    await repository.add({ id: 1, name: 'Item 1' });
    const items = await repository.getAll();
    
    // Modify the returned array item
    items[0].name = 'Modified Name';
    
    // Repository should still have the original value
    expect((await repository.getById(1))?.name).toBe('Item 1');
  });

  it('should return copies from getById to prevent external mutations', async () => {
    await repository.add({ id: 1, name: 'Item 1' });
    const item = await repository.getById(1);
    
    // Modify the returned item
    if (item) {
      item.name = 'Modified Name';
    }
    
    // Repository should still have the original value
    expect((await repository.getById(1))?.name).toBe('Item 1');
  });

  it('should return copies from filter to prevent external mutations', async () => {
    await repository.add({ id: 1, name: 'Item 1' });
    const filteredItems = await repository.filter(item => item.id === 1);
    
    // Modify the returned item
    filteredItems[0].name = 'Modified Name';
    
    // Repository should still have the original value
    expect((await repository.getById(1))?.name).toBe('Item 1');
  });

  it('should return copies from find to prevent external mutations', async () => {
    await repository.add({ id: 1, name: 'Item 1' });
    const foundItem = await repository.find(item => item.id === 1);
    
    // Modify the returned item
    if (foundItem) {
      foundItem.name = 'Modified Name';
    }
    
    // Repository should still have the original value
    expect((await repository.getById(1))?.name).toBe('Item 1');
  });

  it('should create copies when updating items', async () => {
    const originalItem = { id: 1, name: 'Item 1' };
    await repository.add(originalItem);
    
    // Update the item
    await repository.update(1, { name: 'Updated Item' });
    
    // Modify the original object
    originalItem.name = 'Modified Name';
    
    // Repository should still have the updated value, not the modified original
    expect((await repository.getById(1))?.name).toBe('Updated Item');
  });

  describe('locking mechanism', () => {
    it('should serialize concurrent operations when isThreadSafe is true', async () => {
      const repository = new MockRepository();
      repository.isThreadSafe = true;

      // Start multiple concurrent operations
      const promises = [
        repository.add({ id: 1, name: 'Item 1' }),
        repository.add({ id: 2, name: 'Item 2' }),
        repository.add({ id: 3, name: 'Item 3' })
      ];

      await Promise.all(promises);

      // All items should be added successfully
      const allItems = await repository.getAll();
      expect(allItems).toHaveLength(3);
      expect(allItems.map(item => item.id).sort()).toEqual([1, 2, 3]);
    });

    it('should handle concurrent read operations', async () => {
      const repository = new MockRepository();
      await repository.addMany([{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }]);

      // Start multiple concurrent read operations
      const promises = [
        repository.getById(1),
        repository.getById(2),
        repository.getAll(),
        repository.filter(item => item.id === 1),
        repository.find(item => item.id === 2)
      ];

      const results = await Promise.all(promises);

      expect(results[0]).toEqual({ id: 1, name: 'Item 1' });
      expect(results[1]).toEqual({ id: 2, name: 'Item 2' });
      expect(results[2]).toHaveLength(2);
      expect(results[3]).toEqual([{ id: 1, name: 'Item 1' }]);
      expect(results[4]).toEqual({ id: 2, name: 'Item 2' });
    });

    it('should handle mixed read/write operations', async () => {
      const repository = new MockRepository();
      await repository.add({ id: 1, name: 'Item 1' });

      // Start mixed operations
      const promises = [
        repository.update(1, { name: 'Updated Item' }),
        repository.getById(1),
        repository.add({ id: 2, name: 'Item 2' }),
        repository.getAll()
      ];

      const results = await Promise.all(promises);

      expect(results[0]).toBe(true); // update success
      expect(results[1]).toEqual({ id: 1, name: 'Updated Item' }); // getById
      expect(results[2]).toBeUndefined(); // add returns void
      expect(results[3]).toHaveLength(2); // getAll
    });

    it('should work correctly when isThreadSafe is false', async () => {
      const repository = new MockRepository();
      repository.isThreadSafe = false;

      // Operations should still work but without locking
      await repository.add({ id: 1, name: 'Item 1' });
      expect(await repository.getById(1)).toEqual({ id: 1, name: 'Item 1' });
      expect(await repository.size()).toBe(1);
    });
  });
});
