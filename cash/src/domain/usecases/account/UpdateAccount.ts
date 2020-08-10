import { AccountStatus } from '../../model/AccountStatus';
import { AccountType } from '../../model/AccountType';
import { Account } from '../../model/Account';
import { AccountRepository } from '../../port/persistance/AccountRepository';
import { InvalidInputException } from '../InvalidInputException';
import { Logger } from 'pino';

export class UpdateAccount {
  constructor(
    private readonly logger: Logger,
    private readonly accountRepositry: AccountRepository) {}

  update(oldAccount: Account, name: string, status: AccountStatus, type: AccountType) : Promise<Account> {
    if (!name || name.length <= 3) {
      throw new InvalidInputException('name must be at least 3 chars');
    }
    if (!status) {
      throw new InvalidInputException('status must be given');
    }

    if (!type) {
      throw new InvalidInputException('type must be given');
    }

    const newAccount = new Account(oldAccount.id, oldAccount.owner, name, type, status);
    this.logger.info('Update existing account', oldAccount, 'to', newAccount);
    return this.accountRepositry.update(newAccount);
  }
}
