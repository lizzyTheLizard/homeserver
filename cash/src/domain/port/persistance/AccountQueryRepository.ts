import { Account } from '../../model/Account';

export interface AccountQueryRepository{
    find(id: string) : Promise<Account | void>

    findAllForOwner(owner: string): Promise<Account[]>
}
