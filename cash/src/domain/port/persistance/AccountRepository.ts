import { Account } from '../../model/Account';
import { AccountQueryRepository } from './AccountQueryRepository';

export interface AccountRepository extends AccountQueryRepository {
    create(account: Account): Promise<Account>

    update(account: Account): Promise<Account>

    delete(id: string): Promise<void>
}
