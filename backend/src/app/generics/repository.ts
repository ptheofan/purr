import { Predicate } from './repository.types';
import { cloneDeep } from 'lodash';

export abstract class Repository<T, K extends keyof T> {
  protected data: T[] = [];

  protected abstract dataEquals(item: T, id: T[K]): boolean;

  async add(item: T) {
    this.data.push(item);
  }

  async addMany(items: T[]) {
    this.data.push(...items);
  }

  async getAll() {
    return cloneDeep(this.data);
  }

  async filter(predicate: Predicate<T>) {
    return this.data.filter(predicate);
  }

  async find(predicate: Predicate<T>) {
    return this.data.find(predicate);
  }

  async update(id: T[K], update: Partial<T>) {
    const index = this.data.findIndex(item => this.dataEquals(item, id));
    if (index === -1) {
      return;
    }

    this.data[index] = { ...this.data[index], ...update };
  }
}
