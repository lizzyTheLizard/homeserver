import { AccountStatus } from '../../model/AccountStatus';
import { AccountType } from '../../model/AccountType';
import { Account } from '../../model/Account';
import { AccountRepository } from '../../port/persistance/AccountRepository';
import { InvalidInputException } from '../InvalidInputException';
import { validate } from 'uuid';
import { Logger } from 'pino';

export class CreateAccount {
  constructor(
    private readonly logger: Logger,
    private readonly accountRepositry: AccountRepository) {}

  create(id?: string, name?: string, owner?: string, status?: AccountStatus, type?: AccountType) : Promise<Account> {
    if (!id || !validate(id)) {
      throw new InvalidInputException(`id must be a UUID but is ${ id }`);
    }
    if (!name || name.length <= 3) {
      throw new InvalidInputException('name must be at least 3 chars');
    }

    if (!owner || owner.length <= 3) {
      throw new InvalidInputException('owner must be at least 3 chars');
    }

    if (!status) {
      throw new InvalidInputException('valid status must be given');
    }

    if (!type) {
      throw new InvalidInputException('valid type must be given');
    }
    const newAccount = new Account(id, name, owner, type, status);
    this.logger.info(newAccount, 'Create new account');
    return this.accountRepositry.create(newAccount);
  }
}
