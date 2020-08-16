import pino from 'pino';
import { Account } from '../model/Account';
import { AccountStatus } from '../model/AccountStatus';
import { AccountType } from '../model/AccountType';
import { ManageAccounts } from './ManageAccounts';
import { AccountRepository } from '../port/persistance/AccountRepository';
import { InvalidInputException } from '../exceptions/InvalidInputException';
import { NotFoundException } from '../exceptions/NotFoundException';
import { NotAllowedException } from '../exceptions/NotAllowedException';

const id = '123e4567-e89b-12d3-a456-426614174000';
const testAccount = new Account(id, 'owner', 'name', AccountType.CASH, AccountStatus.OPEN);
const logger = pino({ level: 'debug' });

const AccountRepositoryMock = jest.fn<AccountRepository, [Account?, boolean?]>(
  (account?: Account, hasBookings = false) => ({
    find: jest.fn((ignored: string) => Promise.resolve(account)),
    findAllForOwner: jest.fn((ignored: string) => Promise.resolve((account ? [ account ] : []))),
    create: jest.fn((newAccount: Account) => Promise.resolve(newAccount)),
    update: jest.fn((newAccount: Account) => Promise.resolve(newAccount)),
    delete: jest.fn((ignored: string) => Promise.resolve()),
    hasBookingsInAccount: jest.fn((ignored: string) => Promise.resolve(hasBookings)),
  }));

describe('ManageAccounts', () => {
  it('can construct', () => {
    const accountRepository = new AccountRepositoryMock();
    const target = new ManageAccounts(logger, accountRepository);

    expect(target).toBeTruthy();
  });

  it('create', async () => {
    const accountRepository = new AccountRepositoryMock();
    const target = new ManageAccounts(logger, accountRepository);
    await target.create(id, 'owner', 'newName', AccountStatus.OPEN, AccountType.CASH);

    expect(accountRepository.create).toBeCalledWith(expect.objectContaining({
      id,
      name: 'newName',
      owner: 'owner',
      type: AccountType.CASH,
      status: AccountStatus.OPEN,
    }));
    expect(accountRepository.update).not.toHaveBeenCalled();
    expect(accountRepository.delete).not.toHaveBeenCalled();
  });

  it('create name to short', () => {
    const accountRepository = new AccountRepositoryMock();
    const target = new ManageAccounts(logger, accountRepository);
    expect(target.create(id, 'owner', '', AccountStatus.OPEN, AccountType.CASH))
      .rejects.toBeInstanceOf(InvalidInputException);
    expect(accountRepository.create).not.toHaveBeenCalled();
    expect(accountRepository.update).not.toHaveBeenCalled();
    expect(accountRepository.delete).not.toHaveBeenCalled();
  });

  it('create id no UUID', () => {
    const accountRepository = new AccountRepositoryMock();
    const target = new ManageAccounts(logger, accountRepository);
    expect(target.create('123', 'owner', 'newName', AccountStatus.OPEN, AccountType.CASH))
      .rejects.toBeInstanceOf(InvalidInputException);
    expect(accountRepository.create).not.toHaveBeenCalled();
    expect(accountRepository.update).not.toHaveBeenCalled();
    expect(accountRepository.delete).not.toHaveBeenCalled();
  });

  it('update', async () => {
    const accountRepository = new AccountRepositoryMock(testAccount);
    const target = new ManageAccounts(logger, accountRepository);
    await target.update(id, 'owner', 'newName', AccountStatus.CLOSED, AccountType.ASSET);

    expect(accountRepository.create).not.toHaveBeenCalled();
    expect(accountRepository.update).toBeCalledWith(expect.objectContaining({
      id,
      name: 'newName',
      owner: 'owner',
      type: AccountType.ASSET,
      status: AccountStatus.CLOSED,
    }));
    expect(accountRepository.delete).not.toHaveBeenCalled();
  });

  it('update not changed', async () => {
    const accountRepository = new AccountRepositoryMock(testAccount);
    const target = new ManageAccounts(logger, accountRepository);
    await target.update(id, 'owner');

    expect(accountRepository.create).not.toHaveBeenCalled();
    expect(accountRepository.update).toBeCalledWith(expect.objectContaining({
      id,
      name: 'name',
      owner: 'owner',
      type: AccountType.CASH,
      status: AccountStatus.OPEN,
    }));
    expect(accountRepository.delete).not.toHaveBeenCalled();
  });

  it('update not found', async () => {
    const accountRepository = new AccountRepositoryMock();
    const target = new ManageAccounts(logger, accountRepository);
    await expect(target.update(id, 'owner')).rejects.toBeInstanceOf(NotFoundException);
    expect(accountRepository.create).not.toHaveBeenCalled();
    expect(accountRepository.update).not.toHaveBeenCalled();
    expect(accountRepository.delete).not.toHaveBeenCalled();
  });

  it('update not allowed', async () => {
    const accountRepository = new AccountRepositoryMock(testAccount);
    const target = new ManageAccounts(logger, accountRepository);
    await expect(target.update(id, 'else')).rejects.toBeInstanceOf(NotAllowedException);
    expect(accountRepository.create).not.toHaveBeenCalled();
    expect(accountRepository.update).not.toHaveBeenCalled();
    expect(accountRepository.delete).not.toHaveBeenCalled();
  });

  it('update name to short', async () => {
    const accountRepository = new AccountRepositoryMock(testAccount);
    const target = new ManageAccounts(logger, accountRepository);
    await expect(target.update(id, 'owner', '')).rejects.toBeInstanceOf(InvalidInputException);
    expect(accountRepository.create).not.toHaveBeenCalled();
    expect(accountRepository.update).not.toHaveBeenCalled();
    expect(accountRepository.delete).not.toHaveBeenCalled();
  });

  it('delete', async () => {
    const accountRepository = new AccountRepositoryMock(testAccount);
    const target = new ManageAccounts(logger, accountRepository);
    await target.delete(id, 'owner');

    expect(accountRepository.create).not.toHaveBeenCalled();
    expect(accountRepository.update).not.toHaveBeenCalled();
    expect(accountRepository.delete).toBeCalledWith(id);
  });

  it('delete not found', async () => {
    const accountRepository = new AccountRepositoryMock();
    const target = new ManageAccounts(logger, accountRepository);
    await expect(target.delete(id, 'owner')).rejects.toBeInstanceOf(NotFoundException);
    expect(accountRepository.create).not.toHaveBeenCalled();
    expect(accountRepository.update).not.toHaveBeenCalled();
    expect(accountRepository.delete).not.toHaveBeenCalled();
  });

  it('delete not allowed', async () => {
    const accountRepository = new AccountRepositoryMock(testAccount);
    const target = new ManageAccounts(logger, accountRepository);
    await expect(target.delete(id, 'else')).rejects.toBeInstanceOf(NotAllowedException);
    expect(accountRepository.create).not.toHaveBeenCalled();
    expect(accountRepository.update).not.toHaveBeenCalled();
    expect(accountRepository.delete).not.toHaveBeenCalled();
  });

  it('delete with bookings', async () => {
    const accountRepository = new AccountRepositoryMock(testAccount, true);
    const target = new ManageAccounts(logger, accountRepository);
    await expect(target.delete(id, 'owner')).rejects.toBeInstanceOf(InvalidInputException);
    expect(accountRepository.create).not.toHaveBeenCalled();
    expect(accountRepository.update).not.toHaveBeenCalled();
    expect(accountRepository.delete).not.toHaveBeenCalled();
  });
});
