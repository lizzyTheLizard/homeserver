import { Account } from '../model/Account';

export interface AccountRepository{
    findAll() : Promise<Account[]>

    find(id: string) : Promise<Account>

    create(account: Account): Promise<Account>

    update(account: Account): Promise<Account>

    delete(id: string): Promise<void>
}
