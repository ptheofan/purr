import { Repository } from './repository';

class Item {
  id: number;
  name: string;
}

class MockRepository extends Repository<Item, 'id'> {
  protected dataEquals(item: Item, id: Item['id']): boolean {
    return item.id === id;
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
    await repository.update(1, { name: 'Updated Item' });
    expect(await repository.getAll()).toEqual([{ id: 1, name: 'Updated Item' }]);
  });

  it('should not update an item if it does not exist', async () => {
    await repository.update(1, { name: 'Updated Item' });
    expect(await repository.getAll()).toEqual([]);
  });
});
