import { Request, Response, Router as ExpressRouter } from 'express';
import { Logger } from 'pino';
import { Router } from '@awaitjs/express';
import { Account } from '../domain/model/Account';
import { AccountQueryRepository } from '../domain/port/persistance/AccountQueryRepository';
import { CreateAccount } from '../domain/usecases/account/CreateAccount';
import { UpdateAccount } from '../domain/usecases/account/UpdateAccount';
import { DeleteAccount } from '../domain/usecases/account/DeleteAccount';
import { AccountStatus } from '../domain/model/AccountStatus';
import { AccountType } from '../domain/model/AccountType';
import { InvalidInputException } from '../domain/usecases/InvalidInputException';
import { Controller } from './Controller';


// TODO Check if correct owner
export class AccountController implements Controller {
  readonly basePath: string = '/accounts';

  constructor(
        private readonly logger: Logger,
        private readonly accountRepository: AccountQueryRepository,
        private readonly createAccount: CreateAccount,
        private readonly updateAccount: UpdateAccount,
        private readonly deleteAccount: DeleteAccount) {
  }

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
    const accounts = await this.accountRepository.findAll();
    const response = accounts.map((account) => AccountController.toResponseBody(account));
    res.status(200).json(response).send();
  }

  async getSingle(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    req.log.debug('Get Account %s', id);
    const account = await this.accountRepository.find(id);
    if (!account) {
      req.log.info('Cannot find account %s', id);
      res.status(404).json({ 'error': 'Account not found' });
      return;
    }
    const response = AccountController.toResponseBody(account);
    res.status(200).json(response).send();
  }

  async create(req: Request, res: Response): Promise<void> {
    req.log.debug('Create new Account');
    const newAccount = await this.createAccount.create(
                req.body.id as string,
                req.body.owner as string,
                req.body.name as string,
                req.body.status as AccountStatus,
                req.body.type as AccountType);
    const response = AccountController.toResponseBody(newAccount);
    res.status(200).json(response).send();
  }

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    req.log.debug('Update Account %s', id);
    const oldAccount = await this.accountRepository.find(id);
    if (!oldAccount) {
      return this.create(req, res);
    }
    const newAccount = await this.updateAccount.update(oldAccount,
      req.body.name as string,
      req.body.status as AccountStatus,
      req.body.type as AccountType);
    try {
      const response = AccountController.toResponseBody(newAccount);
      res.status(200).json(response).send();
    } catch (error) {
      if (error instanceof InvalidInputException) {
        req.log.info('Invalid input %s', error.message);
        res.status(400).json({ 'error': error.message });
        return;
      }
      throw error;
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    req.log.debug('Delete Account %s', id);
    await this.deleteAccount.delete(id);
    res.sendStatus(200);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static toResponseBody(account: Account) : any {
    return { id: account.id, name: account.name, status: account.status, type: account.type };
  }
}
