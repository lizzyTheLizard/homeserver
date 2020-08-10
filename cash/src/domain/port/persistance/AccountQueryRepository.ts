import { Account } from '../../model/Account';

export interface AccountQueryRepository{
    findAll() : Promise<Account[]>

    find(id: string) : Promise<Account | void>
}
