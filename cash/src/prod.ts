import { AccountController } from './rest/AccountController';
import { Engine } from './rest/Engine';
import { InMemoryAccountRepository } from './persistence/inmemory/InMemoryAccountRepository';
import { CreateAccount } from './domain/usecases/Accounts';
import { UpdateAccount } from './domain/usecases/account/UpdateAccount';
import { DeleteAccount } from './domain/usecases/account/DeleteAccount';
import pino from 'pino';

const logger = pino({ level: 'info' });
// TODO Replace repository
const accountRepository = new InMemoryAccountRepository();
const createAccount = new CreateAccount(logger, accountRepository);
const deleteAccount = new DeleteAccount(logger, accountRepository);
const updateAccount = new UpdateAccount(logger, accountRepository);
const accountController = new AccountController(logger, accountRepository, createAccount, updateAccount, deleteAccount);
const engine = new Engine(8080, logger, [ accountController ]);
engine.run();
