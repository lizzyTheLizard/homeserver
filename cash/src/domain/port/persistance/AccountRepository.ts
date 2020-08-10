import { Account } from '../../model/Account';

export interface AccountRepository{
    create(account: Account): Promise<Account>

    update(account: Account): Promise<Account>

    delete(id: string): Promise<void>
}
