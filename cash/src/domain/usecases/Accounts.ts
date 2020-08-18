import { AccountStatus } from '../model/AccountStatus';
import { AccountType } from '../model/AccountType';
import { Account } from '../model/Account';
import { AccountRepository } from '../port/persistance/AccountRepository';
import { Logger } from 'pino';
import { NotFoundException } from '../exceptions/NotFoundException';
import { NotAllowedException } from '../exceptions/NotAllowedException';
import { InvalidInputException } from '../exceptions/InvalidInputException';

export class Accounts {
  constructor(
    private readonly logger: Logger,
    private readonly accountRepository: AccountRepository) {}

  // We want async exceptions and therefore need async without await
  // eslint-disable-next-line require-await
  async create(id: string, owner: string, name: string, status: AccountStatus, type: AccountType) : Promise<Account> {
    const newAccount = new Account(id, owner, name, type, status);
    this.logger.info(newAccount, 'Create new account');
    return this.accountRepository.create(newAccount);
  }

  async update(id: string, owner: string, name?: string, status?: AccountStatus,
    type?: AccountType) : Promise<Account> {
    const oldAccount = await this.getAccount(id, owner);
    const newAccount = new Account(
      oldAccount.id,
      oldAccount.owner,
      name ?? oldAccount.name,
      type ?? oldAccount.type,
      status ?? oldAccount.status,
    );
    this.logger.info(newAccount, 'Update existing account');
    return this.accountRepository.update(newAccount);
  }

  async delete(id: string, owner: string) : Promise<void> {
    // Just to check if this account is there and accessible
    await this.getAccount(id, owner);
    if (await this.accountRepository.hasBookingsInAccount(id)) {
      throw new InvalidInputException(`Cannot delete account ${ id } as there are bookings`);
    }
    this.logger.info('Delete account %s', id);
    return this.accountRepository.delete(id);
  }

  async getAccount(id: string, owner: string): Promise<Account> {
    const account = await this.accountRepository.find(id);
    if (!account) {
      throw new NotFoundException(`No account with id ${ id } found`);
    }
    if (account.owner !== owner) {
      throw new NotAllowedException(`User ${ owner } cannot access account ${ id }`);
    }
    return account;
  }

  getAll(owner: string): Promise<Account[]> {
    return this.accountRepository.findAllForOwner(owner);
  }
}
