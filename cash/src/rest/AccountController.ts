import { Request, Response, Router as ExpressRouter } from 'express';
import { Logger } from 'pino';
import { Router } from '@awaitjs/express';
import { Account } from '../domain/model/Account';
import { ManageAccounts } from '../domain/usecases/ManageAccounts';
import { AccountStatus } from '../domain/model/AccountStatus';
import { AccountType } from '../domain/model/AccountType';
import { Controller } from './Controller';
import { getRequiredField } from './getRequiredField';
import { InvalidInputException } from '../domain/exceptions/InvalidInputException';

export class AccountController implements Controller {
  // TODO Check if correct owner
  private readonly owner: string = 'testuser';
  readonly basePath: string = '/accounts';

  constructor(
        private readonly logger: Logger,
        private readonly manageAccounts: ManageAccounts) {}

  getRouter(): ExpressRouter {
    this.logger.info('Setup AccountController');
    const router = Router();
    router.getAsync('/', (req, res) => this.getAll(req, res));
    router.getAsync('/:id', (req, res) => this.getSingle(req, res));
    router.postAsync('/', (req, res) => this.create(req, res));
    router.putAsync('/:id', (req, res) => this.update(req, res));
    router.deleteAsync('/:id', (req, res) => this.delete(req, res));
    return router;
  }

  async getAll(req: Request, res: Response): Promise<void> {
    req.log.debug('Get All Accounts');
    const accounts = await this.manageAccounts.getAll(this.owner);
    const response = accounts.map((account) => AccountController.toResponseBody(account));
    res.status(200).json(response).send();
  }

  async getSingle(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    req.log.debug('Get Account %s', id);
    const account = await this.manageAccounts.getAccount(id, this.owner);
    const response = AccountController.toResponseBody(account);
    res.status(200).json(response).send();
  }

  async create(req: Request, res: Response): Promise<void> {
    req.log.debug('Create new Account');
    const newAccount = await this.manageAccounts.create(
      getRequiredField(req, 'id'),
      this.owner,
      getRequiredField(req, 'name'),
      AccountController.toAccountStatus(getRequiredField(req, 'status')),
      AccountController.toAccountType(getRequiredField(req, 'type')));
    const response = AccountController.toResponseBody(newAccount);
    res.status(200).json(response).send();
  }

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    req.log.debug('Update Account %s', id);
    const newAccount = await this.manageAccounts.update(id, this.owner,
      req.body.name as string,
      req.body.status ? AccountController.toAccountStatus(req.body.status) : req.body.status,
      req.body.type ? AccountController.toAccountType(req.body.type) : req.body.status,
    );
    const response = AccountController.toResponseBody(newAccount);
    res.status(200).json(response).send();
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    req.log.debug('Delete Account %s', id);
    await this.manageAccounts.delete(id, this.owner);
    res.sendStatus(200);
  }

  private static toResponseBody(account: Account) : unknown {
    return {
      id: account.id,
      name: account.name,
      status: AccountStatus[account.status],
      type: AccountType[account.type],
    };
  }

  private static toAccountType(input: string): AccountType {
    if (!(input in AccountType)) {
      throw new InvalidInputException(`${ input } is not a valid account type`);
    }
    return AccountType[input as keyof typeof AccountType];
  }

  private static toAccountStatus(input: string): AccountStatus {
    if (!(input in AccountStatus)) {
      throw new InvalidInputException(`${ input } is not a valid account status`);
    }
    return AccountStatus[input as keyof typeof AccountStatus];
  }
}
