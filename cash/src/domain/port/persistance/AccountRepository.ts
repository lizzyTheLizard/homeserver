import { Account } from '../../model/Account';

export interface AccountRepository {
    find(id: string) : Promise<Account | void>

    findAllForOwner(owner: string): Promise<Account[]>

    hasBookingsInAccount(id: string): Promise<boolean>

    create(account: Account): Promise<Account>

    update(account: Account): Promise<Account>

    delete(id: string): Promise<void>
}
