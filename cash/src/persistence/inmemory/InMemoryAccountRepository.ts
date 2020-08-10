import { AccountRepository } from '../../domain/port/persistance/AccountRepository';
import { AccountQueryRepository } from '../../domain/port/persistance/AccountQueryRepository';
import { Account } from '../../domain/model/Account';

export class InMemoryAccountRepository implements AccountRepository, AccountQueryRepository {
  create(account: Account): Promise<import('../../domain/model/Account').Account> {
    throw new Error('Method not implemented.');
  }
  update(account: Account): Promise<import('../../domain/model/Account').Account> {
    throw new Error('Method not implemented.');
  }
  delete(id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  findAll(): Promise<import('../../domain/model/Account').Account[]> {
    throw new Error('Method not implemented.');
  }
  find(id: string): Promise<import('../../domain/model/Account').Account> {
    throw new Error('Method not implemented.');
  }
}
