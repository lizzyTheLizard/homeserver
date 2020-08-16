import pino from 'pino';
import { Account } from '../model/Account';
import { AccountStatus } from '../model/AccountStatus';
import { AccountType } from '../model/AccountType';
import { ManageBookings, GetAccounts } from './ManageBookings';
import { InvalidInputException } from '../exceptions/InvalidInputException';
import { NotFoundException } from '../exceptions/NotFoundException';
import { NotAllowedException } from '../exceptions/NotAllowedException';
import { Booking } from '../model/Booking';
import { BookingRepository } from '../port/persistance/BookingRepository';
import Big from 'big.js';

const logger = pino({ level: 'debug' });
const testToAccount = new Account('123e4567-e89b-12d3-a456-426614174010',
  'owner', 'name', AccountType.CASH, AccountStatus.OPEN);
const testFromAccount = new Account('123e4567-e89b-12d3-a456-426614174020',
  'owner', 'name', AccountType.CASH, AccountStatus.OPEN);
const id = '123e4567-e89b-12d3-a456-426614174000';
const testBooking = new Booking(id, 'owner', testFromAccount, testToAccount, new Date(), new Big(1.0), 'test');

const BookingRepositoryMock = jest.fn<BookingRepository, [Booking?]>((booking?: Booking) => ({
  find: jest.fn((ignored: string) => Promise.resolve(booking)),
  findAllForOwner: jest.fn((ignored: string) => Promise.resolve((booking ? [ booking ] : []))),
  create: jest.fn((newBooking: Booking) => Promise.resolve(newBooking)),
  update: jest.fn((newBooking: Booking) => Promise.resolve(newBooking)),
  delete: jest.fn((ignored: string) => Promise.resolve()),
}));

const GetAccountsMock = jest.fn<GetAccounts, [Account]>((account: Account) => ({
  getAccount: jest.fn((aId: string, owner: string) => {
    const result = [ testToAccount, testFromAccount ].find((accountToCheck) => accountToCheck.id === aId);
    if (result) {
      return Promise.resolve(result);
    }
    return Promise.reject(new NotFoundException(''));
  }) }));

describe('ManageBookings', () => {
  it('can construct', () => {
    const getAccounts = new GetAccountsMock(testToAccount);
    const bookingRepository = new BookingRepositoryMock();
    const target = new ManageBookings(logger, getAccounts, bookingRepository);

    expect(target).toBeTruthy();
  });

  it('create', async () => {
    const getAccounts = new GetAccountsMock(testToAccount);
    const bookingRepository = new BookingRepositoryMock();
    const target = new ManageBookings(logger, getAccounts, bookingRepository);
    const date = new Date();

    await target.create(id, 'owner', testFromAccount.id, testToAccount.id, date, 10.1, 'newComment');

    expect(bookingRepository.create).toBeCalledWith(expect.objectContaining({
      id,
      owner: 'owner',
      from: testFromAccount,
      to: testToAccount,
      amount: new Big(10.1),
      comment: 'newComment',
      date,
    }));
    expect(bookingRepository.update).not.toHaveBeenCalled();
    expect(bookingRepository.delete).not.toHaveBeenCalled();
  });

  it('create comment to short', async () => {
    const getAccounts = new GetAccountsMock(testToAccount);
    const bookingRepository = new BookingRepositoryMock();
    const target = new ManageBookings(logger, getAccounts, bookingRepository);

    await expect(target.create(id, 'owner', testFromAccount.id, testToAccount.id, new Date(), 10.1, ''))
      .rejects.toBeInstanceOf(InvalidInputException);

    expect(bookingRepository.create).not.toHaveBeenCalled();
    expect(bookingRepository.update).not.toHaveBeenCalled();
    expect(bookingRepository.delete).not.toHaveBeenCalled();
  });

  it('create id no UUID', async () => {
    const getAccounts = new GetAccountsMock(testToAccount);
    const bookingRepository = new BookingRepositoryMock();
    const target = new ManageBookings(logger, getAccounts, bookingRepository);

    await expect(target.create('123', 'owner', testFromAccount.id, testToAccount.id, new Date(), 10.1, 'newComment'))
      .rejects.toBeInstanceOf(InvalidInputException);

    expect(bookingRepository.create).not.toHaveBeenCalled();
    expect(bookingRepository.update).not.toHaveBeenCalled();
    expect(bookingRepository.delete).not.toHaveBeenCalled();
  });

  it('update', async () => {
    const getAccounts = new GetAccountsMock(testToAccount);
    const bookingRepository = new BookingRepositoryMock(testBooking);
    const target = new ManageBookings(logger, getAccounts, bookingRepository);
    const date = new Date();

    await target.update(id, 'owner', testFromAccount.id, testToAccount.id, date, 10.1, 'newComment');

    expect(bookingRepository.create).not.toHaveBeenCalled();
    expect(bookingRepository.update).toBeCalledWith(expect.objectContaining({
      id,
      owner: 'owner',
      from: testFromAccount,
      to: testToAccount,
      amount: new Big(10.1),
      comment: 'newComment',
      date,
    }));
    expect(bookingRepository.delete).not.toHaveBeenCalled();
  });

  it('update not changed', async () => {
    const getAccounts = new GetAccountsMock(testToAccount);
    const bookingRepository = new BookingRepositoryMock(testBooking);
    const target = new ManageBookings(logger, getAccounts, bookingRepository);

    await target.update(id, 'owner');

    expect(bookingRepository.create).not.toHaveBeenCalled();
    expect(bookingRepository.update).toBeCalledWith(testBooking);
    expect(bookingRepository.delete).not.toHaveBeenCalled();
  });

  it('update not found', async () => {
    const getAccounts = new GetAccountsMock(testToAccount);
    const bookingRepository = new BookingRepositoryMock();
    const target = new ManageBookings(logger, getAccounts, bookingRepository);

    await expect(target.update(id, 'owner')).rejects.toBeInstanceOf(NotFoundException);

    expect(bookingRepository.create).not.toHaveBeenCalled();
    expect(bookingRepository.update).not.toHaveBeenCalled();
    expect(bookingRepository.delete).not.toHaveBeenCalled();
  });

  it('update not allowed', async () => {
    const getAccounts = new GetAccountsMock(testToAccount);
    const bookingRepository = new BookingRepositoryMock(testBooking);
    const target = new ManageBookings(logger, getAccounts, bookingRepository);

    await expect(target.update(id, 'else')).rejects.toBeInstanceOf(NotAllowedException);

    expect(bookingRepository.create).not.toHaveBeenCalled();
    expect(bookingRepository.update).not.toHaveBeenCalled();
    expect(bookingRepository.delete).not.toHaveBeenCalled();
  });

  it('update comment to short', async () => {
    const getAccounts = new GetAccountsMock(testToAccount);
    const bookingRepository = new BookingRepositoryMock(testBooking);
    const target = new ManageBookings(logger, getAccounts, bookingRepository);

    await expect(target.update(id, 'owner', testFromAccount.id, testToAccount.id, new Date(), 10.1, ''))
      .rejects.toBeInstanceOf(InvalidInputException);

    expect(bookingRepository.create).not.toHaveBeenCalled();
    expect(bookingRepository.update).not.toHaveBeenCalled();
    expect(bookingRepository.delete).not.toHaveBeenCalled();
  });

  it('delete', async () => {
    const getAccounts = new GetAccountsMock(testToAccount);
    const bookingRepository = new BookingRepositoryMock(testBooking);
    const target = new ManageBookings(logger, getAccounts, bookingRepository);

    await target.delete(id, 'owner');

    expect(bookingRepository.create).not.toHaveBeenCalled();
    expect(bookingRepository.update).not.toHaveBeenCalled();
    expect(bookingRepository.delete).toBeCalledWith(id);
  });

  it('delete not found', async () => {
    const getAccounts = new GetAccountsMock(testToAccount);
    const bookingRepository = new BookingRepositoryMock();
    const target = new ManageBookings(logger, getAccounts, bookingRepository);

    await expect(target.delete(id, 'owner')).rejects.toBeInstanceOf(NotFoundException);

    expect(bookingRepository.create).not.toHaveBeenCalled();
    expect(bookingRepository.update).not.toHaveBeenCalled();
    expect(bookingRepository.delete).not.toHaveBeenCalled();
  });

  it('delete not allowed', async () => {
    const getAccounts = new GetAccountsMock(testToAccount);
    const bookingRepository = new BookingRepositoryMock(testBooking);
    const target = new ManageBookings(logger, getAccounts, bookingRepository);

    await expect(target.delete(id, 'else')).rejects.toBeInstanceOf(NotAllowedException);

    expect(bookingRepository.create).not.toHaveBeenCalled();
    expect(bookingRepository.update).not.toHaveBeenCalled();
    expect(bookingRepository.delete).not.toHaveBeenCalled();
  });
});
