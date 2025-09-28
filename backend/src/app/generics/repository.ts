import { Predicate } from './repository.types';

export abstract class Repository<T, K extends keyof T> {
  /**
   * The data of the repository.
   * This is an array of items.
   */
  protected data: T[] = [];

  /**
   * The index of the repository.
   * This is a map of keys to indices.
   */
  protected index: Map<T[K], number> = new Map();

  /**
   * Whether to use a lock to protect the repository.
   * This is used to prevent multiple threads from accessing the repository at the same time.
   * This is useful for multi-threaded environments.
   */
  isThreadSafe: boolean = true;

  /**
   * The mutex lock for protecting repository operations.
   * This is used when withLock is true to prevent concurrent access.
   */
  private lock: Promise<void> = Promise.resolve();

  /**
   * Acquires a lock for repository operations.
   * This method ensures that operations are serialized when withLock is true.
   * @param operation The operation to execute with the lock
   * @returns The result of the operation
   */
  protected async withLock<TResult>(operation: () => TResult): Promise<TResult> {
    if (!this.isThreadSafe) {
      return operation();
    }

    return new Promise<TResult>((resolve, reject) => {
      this.lock = this.lock.then(async () => {
        try {
          const result = operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }).catch(reject);
    });
  }

  /**
   * Checks if two items are equal.
   * This is used to identify the item in the repository.
   * The key should be unique and immutable.
   * If the items are equal, the repository will update the existing item.
   * If the items are not equal, the repository will add the new item.
   * @param item The item to check
   * @param id The key of the item
   * @returns True if the items are equal, false otherwise
   */
  protected abstract dataEquals(item: T, id: T[K]): boolean;

  /**
   * Gets the key of the item.
   * This is used to identify the item in the repository.
   * The key should be unique and immutable.
   * @param item The item to get the key from
   * @returns The key of the item
   */
  protected abstract getKey(item: T): T[K];

  /**
   * Creates a deep copy of the item.
   * This is used to prevent external mutations.
   * The copy should be a new object with the same properties as the original.
   * The copy should not have the same reference as the original.
   * The copy should not have the same reference as the original.
   * @param item The item to copy
   * @returns A deep copy of the item
   */
  protected abstract copyItem(item: T): T;

  /**
   * Adds an item to the repository.
   * If the item already exists, the repository will update the existing item.
   * If the item does not exist, the repository will add the new item.
   * @param item The item to add
   */
  async add(item: T): Promise<void> {
    return this.withLock(() => {
      const key = this.getKey(item);
      const existingIndex = this.index.get(key);
      
      // Always create a copy to prevent external mutations
      const itemCopy = this.copyItem(item);
      
      if (existingIndex !== undefined) {
        // Update existing item
        this.data[existingIndex] = itemCopy;
      } else {
        // Add new item
        const newIndex = this.data.length;
        this.data.push(itemCopy);
        this.index.set(key, newIndex);
      }
    });
  }

  /**
   * Adds multiple items to the repository.
   * @param items The items to add
   */
  async addMany(items: T[]): Promise<void> {
    return this.withLock(async () => {
      for (const item of items) {
        const key = this.getKey(item);
        const existingIndex = this.index.get(key);
        
        // Always create a copy to prevent external mutations
        const itemCopy = this.copyItem(item);
        
        if (existingIndex !== undefined) {
          // Update existing item
          this.data[existingIndex] = itemCopy;
        } else {
          // Add new item
          const newIndex = this.data.length;
          this.data.push(itemCopy);
          this.index.set(key, newIndex);
        }
      }
    });
  }

  /**
   * Gets all items from the repository.
   * @returns All items from the repository
   */
  async getAll(): Promise<T[]> {
    return this.withLock(() => {
      // Return copies to prevent external mutations
      return this.data.map(item => this.copyItem(item));
    });
  }

  /**
   * Gets an item from the repository by its key.
   * @param id The key of the item
   * @returns The item from the repository
   */
  async getById(id: T[K]): Promise<T | undefined> {
    return this.withLock(() => {
      const index = this.index.get(id);
      return index !== undefined ? this.copyItem(this.data[index]) : undefined;
    });
  }

  /**
   * Filters the items from the repository by a predicate.
   * @param predicate The predicate to filter the items by
   * @returns The filtered items from the repository
   */
  async filter(predicate: Predicate<T>): Promise<T[]> {
    return this.withLock(() => {
      // Return copies to prevent external mutations
      return this.data.filter(predicate).map(item => this.copyItem(item));
    });
  }

  /**
   * Finds an item from the repository by a predicate.
   * @param predicate The predicate to find the item by
   * @returns The found item from the repository
   */
  async find(predicate: Predicate<T>): Promise<T | undefined> {
    return this.withLock(() => {
      const found = this.data.find(predicate);
      return found ? this.copyItem(found) : undefined;
    });
  }

  /**
   * Updates an item in the repository by its key.
   * @param id The key of the item
   * @param update The update to apply to the item
   * @returns True if the item was updated, false otherwise
   */
  async update(id: T[K], update: Partial<T>): Promise<boolean> {
    return this.withLock(() => {
      const index = this.index.get(id);
      if (index === undefined) {
        return false;
      }

      const existingItem = this.data[index];
      // Create a new copy with the updates to prevent external mutations
      this.data[index] = this.copyItem({ ...existingItem, ...update });
      return true;
    });
  }

  /**
   * Removes an item from the repository by its key.
   * @param id The key of the item
   * @returns True if the item was removed, false otherwise
   */
  async remove(id: T[K]): Promise<boolean> {
    return this.withLock(() => {
      const index = this.index.get(id);
      if (index === undefined) {
        return false;
      }

      // Remove from data array
      this.data.splice(index, 1);
      
      // Remove from index
      this.index.delete(id);
      
      // Rebuild index for items after the removed one
      for (let i = index; i < this.data.length; i++) {
        const key = this.getKey(this.data[i]);
        this.index.set(key, i);
      }
      
      return true;
    });
  }

  /**
   * Removes multiple items from the repository by a predicate.
   * @param predicate The predicate to remove the items by
   * @returns The number of items removed
   */
  async removeMany(predicate: Predicate<T>): Promise<number> {
    return this.withLock(() => {
      const indicesToRemove: number[] = [];
      const keysToRemove: T[K][] = [];
      
      // Find all items to remove
      for (let i = 0; i < this.data.length; i++) {
        if (predicate(this.data[i])) {
          indicesToRemove.push(i);
          keysToRemove.push(this.getKey(this.data[i]));
        }
      }
      
      // Remove in reverse order to maintain indices
      for (let i = indicesToRemove.length - 1; i >= 0; i--) {
        this.data.splice(indicesToRemove[i], 1);
      }
      
      // Clear and rebuild index
      this.index.clear();
      for (let i = 0; i < this.data.length; i++) {
        const key = this.getKey(this.data[i]);
        this.index.set(key, i);
      }
      
      return keysToRemove.length;
    });
  }

  /**
   * Removes all items from the repository.
   */
  async removeAll(): Promise<void> {
    return this.withLock(() => {
      this.data = [];
      this.index.clear();
    });
  }

  /**
   * Checks if an item exists in the repository by its key.
   * @param id The key of the item
   * @returns True if the item exists, false otherwise
   */
  async has(id: T[K]): Promise<boolean> {
    return this.withLock(() => {
      return this.index.has(id);
    });
  }

  /**
   * Gets the size of the repository.
   * @returns The size of the repository
   */
  async size(): Promise<number> {
    return this.withLock(() => {
      return this.data.length;
    });
  }

  /**
   * Checks if the repository is empty.
   * @returns True if the repository is empty, false otherwise
   */
  async isEmpty(): Promise<boolean> {
    return this.withLock(() => {
      return this.data.length === 0;
    });
  }

  /**
   * Updates multiple items in the repository by their keys.
   * @param updates The updates to apply to the items
   * @returns The number of items updated
   */
  async bulkUpdate(updates: Array<{ id: T[K]; update: Partial<T> }>): Promise<number> {
    return this.withLock(() => {
      let updatedCount = 0;
      
      for (const { id, update } of updates) {
        const index = this.index.get(id);
        if (index !== undefined) {
          const existingItem = this.data[index];
          this.data[index] = this.copyItem({ ...existingItem, ...update });
          updatedCount++;
        }
      }
      
      return updatedCount;
    });
  }

  /**
   * Removes multiple items from the repository by their keys.
   * @param ids The keys of the items to remove
   * @returns The number of items removed
   */
  async bulkRemove(ids: T[K][]): Promise<number> {
    return this.withLock(() => {
      let removedCount = 0;
      const indicesToRemove: number[] = [];
      
      // Find all items to remove
      for (const id of ids) {
        const index = this.index.get(id);
        if (index !== undefined) {
          indicesToRemove.push(index);
          this.index.delete(id);
          removedCount++;
        }
      }
      
      // Sort indices in descending order and remove items
      indicesToRemove.sort((a, b) => b - a);
      for (const index of indicesToRemove) {
        this.data.splice(index, 1);
      }
      
      // Rebuild index for remaining items
      this.index.clear();
      for (let i = 0; i < this.data.length; i++) {
        const key = this.getKey(this.data[i]);
        this.index.set(key, i);
      }
      
      return removedCount;
    });
  }
}
