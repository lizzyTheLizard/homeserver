import pino from 'pino';
import { CreateAccount } from './CreateAccount';
import { Account } from '../../model/Account';
import { AccountStatus } from '../../model/AccountStatus';
import { AccountType } from '../../model/AccountType';
import { InvalidInputException } from '../InvalidInputException';

/* eslint-disable no-undefined */

const id = '123e4567-e89b-12d3-a456-426614174000';
const logger = pino({ level: 'debug' });
const accountRepository = {
  create: jest.fn(async (account: Account) => account), // eslint-disable-line require-await
  update: jest.fn(async (account: Account) => account), // eslint-disable-line require-await
  delete: jest.fn(async (ignored: string) => {}), // eslint-disable-line @typescript-eslint/no-empty-function
};

describe('CreateAccount', () => {
  beforeEach(() => {
    accountRepository.create.mock.calls = [];
    accountRepository.update.mock.calls = [];
    accountRepository.delete.mock.calls = [];
  });

  it('can construct', () => {
    const target = new CreateAccount(logger, accountRepository);
    expect(target).toBeTruthy();
  });

  it('Valid', () => {
    const target = new CreateAccount(logger, accountRepository);
    target.create(id, 'name', 'owner', AccountStatus.CLOSED, AccountType.CASH);

    expect(accountRepository.create.mock.calls.length).toBe(1);
    expect(accountRepository.update.mock.calls.length).toBe(0);
    expect(accountRepository.delete.mock.calls.length).toBe(0);
  });


  it('Check ID', () => {
    const target = new CreateAccount(logger, accountRepository);
    expect(() => target.create(undefined, 'name', 'owner', AccountStatus.CLOSED, AccountType.CASH))
      .toThrow(InvalidInputException);
    expect(() => target.create('123', 'name', 'owner', AccountStatus.CLOSED, AccountType.CASH))
      .toThrow(InvalidInputException);

    expect(accountRepository.create.mock.calls.length).toBe(0);
    expect(accountRepository.update.mock.calls.length).toBe(0);
    expect(accountRepository.delete.mock.calls.length).toBe(0);
  });

  it('Check Name', () => {
    const target = new CreateAccount(logger, accountRepository);
    expect(() => target.create(id, undefined, 'owner', AccountStatus.CLOSED, AccountType.CASH))
      .toThrow(InvalidInputException);
    expect(() => target.create(id, '', 'owner', AccountStatus.CLOSED, AccountType.CASH))
      .toThrow(InvalidInputException);

    expect(accountRepository.create.mock.calls.length).toBe(0);
    expect(accountRepository.update.mock.calls.length).toBe(0);
    expect(accountRepository.delete.mock.calls.length).toBe(0);
  });

  it('Check Owner', () => {
    const target = new CreateAccount(logger, accountRepository);
    expect(() => target.create(id, 'name', undefined, AccountStatus.CLOSED, AccountType.CASH))
      .toThrow(InvalidInputException);
    expect(() => target.create(id, 'name', '', AccountStatus.CLOSED, AccountType.CASH))
      .toThrow(InvalidInputException);

    expect(accountRepository.create.mock.calls.length).toBe(0);
    expect(accountRepository.update.mock.calls.length).toBe(0);
    expect(accountRepository.delete.mock.calls.length).toBe(0);
  });

  it('Check Status', () => {
    const target = new CreateAccount(logger, accountRepository);
    expect(() => target.create(id, 'name', 'owner', undefined, AccountType.CASH))
      .toThrow(InvalidInputException);
    expect(accountRepository.create.mock.calls.length).toBe(0);
    expect(accountRepository.update.mock.calls.length).toBe(0);
    expect(accountRepository.delete.mock.calls.length).toBe(0);
  });

  it('Check Type', () => {
    const target = new CreateAccount(logger, accountRepository);
    expect(() => target.create(id, 'name', 'owner', AccountStatus.CLOSED, undefined))
      .toThrow(InvalidInputException);
    expect(accountRepository.create.mock.calls.length).toBe(0);
    expect(accountRepository.update.mock.calls.length).toBe(0);
    expect(accountRepository.delete.mock.calls.length).toBe(0);
  });
});
