/* eslint-disable @typescript-eslint/no-explicit-any */
import pino from 'pino';
import { Account } from '../model/Account';
import { AccountStatus } from '../model/AccountStatus';
import { AccountType } from '../model/AccountType';
import { Bookings } from './Bookings';
import { InvalidInputException } from '../exceptions/InvalidInputException';
import { NotFoundException } from '../exceptions/NotFoundException';
import { NotAllowedException } from '../exceptions/NotAllowedException';
import { Booking } from '../model/Booking';
import Big from 'big.js';

const logger = pino({ level: 'debug' });
const date = new Date();
const testToAccount = new Account('123e4567-e89b-12d3-a456-426614174010',
  'owner', 'name', AccountType.CASH, AccountStatus.OPEN);
const testFromAccount = new Account('123e4567-e89b-12d3-a456-426614174020',
  'owner', 'name', AccountType.CASH, AccountStatus.OPEN);
const testBooking = new Booking(
  '123e4567-e89b-12d3-a456-426614174000', 'owner',
  testFromAccount, testToAccount, new Date(), new Big(1.0), 'test');
const accounts : any = {
  getAccount: jest.fn((aId: string) => {
    const result = [ testToAccount, testFromAccount ].find((accountToCheck) => accountToCheck.id === aId);
    if (result) {
      return Promise.resolve(result);
    }
    return Promise.reject(new NotFoundException(''));
  }) };

describe('Bookings', () => {
  it('can construct', () => {
    const bookingRepository = {} as any;
    const target = new Bookings(logger, accounts, bookingRepository);

    expect(target).toBeTruthy();
  });

  it('create valid', async () => {
    const bookingRepository = { create: jest.fn() } as any;
    const target = new Bookings(logger, accounts, bookingRepository);

    await target.create(testBooking.id, 'owner', testFromAccount.id, testToAccount.id, date, 10.1, 'newComment');

    expect(bookingRepository.create).toBeCalledWith(expect.objectContaining({
      id: testBooking.id,
      owner: 'owner',
      from: testFromAccount,
      to: testToAccount,
      amount: new Big(10.1),
      comment: 'newComment',
      date,
    }));
  });

  it('create comment to short', async () => {
    const bookingRepository = {} as any;
    const target = new Bookings(logger, accounts, bookingRepository);

    await expect(target.create(testBooking.id, 'owner', testFromAccount.id, testToAccount.id, new Date(), 10.1, ''))
      .rejects.toBeInstanceOf(InvalidInputException);
  });

  it('create id no UUID', async () => {
    const bookingRepository = {} as any;
    const target = new Bookings(logger, accounts, bookingRepository);

    await expect(target.create('123', 'owner', testFromAccount.id, testToAccount.id, new Date(), 10.1, 'newComment'))
      .rejects.toBeInstanceOf(InvalidInputException);
  });

  it('update valid', async () => {
    const bookingRepository = { find: jest.fn(() => testBooking), update: jest.fn() } as any;
    const target = new Bookings(logger, accounts, bookingRepository);

    await target.update(testBooking.id, 'owner', testFromAccount.id, testToAccount.id, date, 10.1, 'newComment');

    expect(bookingRepository.update).toBeCalledWith(expect.objectContaining({
      id: testBooking.id,
      owner: 'owner',
      from: testFromAccount,
      to: testToAccount,
      amount: new Big(10.1),
      comment: 'newComment',
      date,
    }));
  });

  it('update not changed', async () => {
    const bookingRepository = { find: jest.fn(() => testBooking), update: jest.fn() } as any;
    const target = new Bookings(logger, accounts, bookingRepository);

    await target.update(testBooking.id, 'owner');

    expect(bookingRepository.update).toBeCalledWith(testBooking);
  });

  it('update not found', async () => {
    const bookingRepository = { find: jest.fn() } as any;
    const target = new Bookings(logger, accounts, bookingRepository);

    await expect(target.update(testBooking.id, 'owner')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update not allowed', async () => {
    const bookingRepository = { find: jest.fn(() => testBooking) } as any;
    const target = new Bookings(logger, accounts, bookingRepository);

    await expect(target.update(testBooking.id, 'else')).rejects.toBeInstanceOf(NotAllowedException);
  });

  it('update comment to short', async () => {
    const bookingRepository = { find: jest.fn(() => testBooking) } as any;
    const target = new Bookings(logger, accounts, bookingRepository);

    await expect(target.update(testBooking.id, 'owner', testFromAccount.id, testToAccount.id, new Date(), 10.1, ''))
      .rejects.toBeInstanceOf(InvalidInputException);
  });

  it('delete valid', async () => {
    const bookingRepository = { find: jest.fn(() => testBooking), delete: jest.fn() } as any;
    const target = new Bookings(logger, accounts, bookingRepository);

    await target.delete(testBooking.id, 'owner');

    expect(bookingRepository.delete).toBeCalledWith(testBooking.id);
  });

  it('delete not found', async () => {
    const bookingRepository = { find: jest.fn() } as any;
    const target = new Bookings(logger, accounts, bookingRepository);

    await expect(target.delete(testBooking.id, 'owner')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delete not allowed', async () => {
    const bookingRepository = { find: jest.fn(() => testBooking) } as any;
    const target = new Bookings(logger, accounts, bookingRepository);

    await expect(target.delete(testBooking.id, 'else')).rejects.toBeInstanceOf(NotAllowedException);
  });
});
