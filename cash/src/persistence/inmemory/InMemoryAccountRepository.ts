import { AccountRepository } from '../../domain/port/persistance/AccountRepository';
import { Account } from '../../domain/model/Account';

export class InMemoryAccountRepository implements AccountRepository {
  private accounts: Map<string, Account> = new Map<string, Account>();

  create(account: Account): Promise<Account> {
    this.accounts.set(account.id, account);
    return Promise.resolve(account);
  }

  update(account: Account): Promise<Account> {
    this.accounts.set(account.id, account);
    return Promise.resolve(account);
  }

  delete(id: string): Promise<void> {
    this.accounts.delete(id);
    return Promise.resolve();
  }

  findAllForOwner(owner: string): Promise<Account[]> {
    const result: Account[] = [];
    this.accounts.forEach((account) => {
      if (account.owner === owner) {
        result.push(account);
      }
    });
    return Promise.resolve(result);
  }

  find(id: string): Promise<Account | undefined> {
    return Promise.resolve(this.accounts.get(id));
  }
}
