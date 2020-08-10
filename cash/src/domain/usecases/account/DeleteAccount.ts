import { AccountRepository } from '../../port/persistance/AccountRepository';
import { Logger } from 'pino';

export class DeleteAccount {
  constructor(
    private readonly logger: Logger,
    private readonly accountRepositry: AccountRepository) {}

  delete(id: string) : Promise<void> {
    this.logger.info('Delete account', id);
    return this.accountRepositry.delete(id);
  }
}
