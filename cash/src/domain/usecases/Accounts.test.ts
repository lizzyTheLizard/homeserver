/* eslint-disable @typescript-eslint/no-explicit-any */
import pino from 'pino';
import { Account } from '../model/Account';
import { AccountStatus } from '../model/AccountStatus';
import { AccountType } from '../model/AccountType';
import { Accounts } from './Accounts';
import { InvalidInputException } from '../exceptions/InvalidInputException';
import { NotFoundException } from '../exceptions/NotFoundException';
import { NotAllowedException } from '../exceptions/NotAllowedException';

const testAccount = new Account(
  '123e4567-e89b-12d3-a456-426614174000', 'owner', 'name',
  AccountType.CASH, AccountStatus.OPEN);
const logger = pino({ level: 'debug' });

describe('Accounts', () => {
  it('can construct', () => {
    const accountRepository: any = { };
    const target = new Accounts(logger, accountRepository);

    expect(target).toBeTruthy();
  });

  it('create', async () => {
    const accountRepository: any = { create: jest.fn() };
    const target = new Accounts(logger, accountRepository);

    await target.create(testAccount.id, 'owner', 'newName', AccountStatus.OPEN, AccountType.CASH);

    expect(accountRepository.create).toBeCalledWith(expect.objectContaining({
      id: testAccount.id,
      name: 'newName',
      owner: 'owner',
      type: AccountType.CASH,
      status: AccountStatus.OPEN,
    }));
  });

  it('create name to short', () => {
    const accountRepository: any = { };
    const target = new Accounts(logger, accountRepository);

    expect(target.create(testAccount.id, 'owner', '', AccountStatus.OPEN, AccountType.CASH))
      .rejects.toBeInstanceOf(InvalidInputException);
  });

  it('create id no UUID', () => {
    const accountRepository: any = { };
    const target = new Accounts(logger, accountRepository);

    expect(target.create('123', 'owner', 'newName', AccountStatus.OPEN, AccountType.CASH))
      .rejects.toBeInstanceOf(InvalidInputException);
  });

  it('update valid', async () => {
    const accountRepository: any = { find: jest.fn(() => testAccount), update: jest.fn() };
    const target = new Accounts(logger, accountRepository);

    await target.update(testAccount.id, 'owner', 'newName', AccountStatus.CLOSED, AccountType.ASSET);

    expect(accountRepository.update).toBeCalledWith(expect.objectContaining({
      id: testAccount.id,
      name: 'newName',
      owner: 'owner',
      type: AccountType.ASSET,
      status: AccountStatus.CLOSED,
    }));
  });

  it('update not changed', async () => {
    const accountRepository: any = { find: jest.fn(() => testAccount), update: jest.fn() };
    const target = new Accounts(logger, accountRepository);

    await target.update(testAccount.id, 'owner');

    expect(accountRepository.update).toBeCalledWith(expect.objectContaining({
      id: testAccount.id,
      name: 'name',
      owner: 'owner',
      type: AccountType.CASH,
      status: AccountStatus.OPEN,
    }));
  });

  it('update not found', async () => {
    const accountRepository: any = { find: jest.fn() };
    const target = new Accounts(logger, accountRepository);

    await expect(target.update(testAccount.id, 'owner')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update not allowed', async () => {
    const accountRepository: any = { find: jest.fn(() => testAccount) };
    const target = new Accounts(logger, accountRepository);

    await expect(target.update(testAccount.id, 'else')).rejects.toBeInstanceOf(NotAllowedException);
  });

  it('update name to short', async () => {
    const accountRepository: any = { find: jest.fn(() => testAccount) };
    const target = new Accounts(logger, accountRepository);

    await expect(target.update(testAccount.id, 'owner', '')).rejects.toBeInstanceOf(InvalidInputException);
  });

  it('delete valid', async () => {
    const accountRepository: any = {
      find: jest.fn(() => testAccount),
      hasBookingsInAccount: jest.fn(() => false),
      delete: jest.fn() };
    const target = new Accounts(logger, accountRepository);

    await target.delete(testAccount.id, 'owner');

    expect(accountRepository.delete).toBeCalledWith(testAccount.id);
  });

  it('delete not found', async () => {
    const accountRepository: any = { find: jest.fn() };
    const target = new Accounts(logger, accountRepository);

    await expect(target.delete(testAccount.id, 'owner')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delete not allowed', async () => {
    const accountRepository: any = { find: jest.fn(() => testAccount) };
    const target = new Accounts(logger, accountRepository);

    await expect(target.delete(testAccount.id, 'else')).rejects.toBeInstanceOf(NotAllowedException);
  });

  it('delete with bookings', async () => {
    const accountRepository: any = {
      find: jest.fn(() => testAccount),
      hasBookingsInAccount: jest.fn(() => true),
      delete: jest.fn() };
    const target = new Accounts(logger, accountRepository);

    await expect(target.delete(testAccount.id, 'owner')).rejects.toBeInstanceOf(InvalidInputException);
  });
});
