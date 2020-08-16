import { AccountRepository } from '../../domain/port/persistance/AccountRepository';
import { Account } from '../../domain/model/Account';
import { InMemoryDB } from './InMemoryDB';

export class InMemoryAccountRepository implements AccountRepository {
  constructor(private readonly db: InMemoryDB) {}

  create(account: Account): Promise<Account> {
    this.db.accounts.set(account.id, account);
    return Promise.resolve(account);
  }

  update(account: Account): Promise<Account> {
    this.db.accounts.set(account.id, account);
    return Promise.resolve(account);
  }

  delete(id: string): Promise<void> {
    this.db.accounts.delete(id);
    return Promise.resolve();
  }

  findAllForOwner(owner: string): Promise<Account[]> {
    const result: Account[] = [];
    this.db.accounts.forEach((account) => {
      if (account.owner === owner) {
        result.push(account);
      }
    });
    return Promise.resolve(result);
  }

  find(id: string): Promise<Account | undefined> {
    return Promise.resolve(this.db.accounts.get(id));
  }

  hasBookingsInAccount(id: string): Promise<boolean> {
    let found = false;
    this.db.bookings.forEach((booking) => {
      if (booking.from.id === id || booking.to.id === id) {
        found = true;
      }
    });
    return Promise.resolve(found);
  }
}
