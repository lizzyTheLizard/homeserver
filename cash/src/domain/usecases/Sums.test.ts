/* eslint-disable @typescript-eslint/no-explicit-any */
import pino from 'pino';
import { Sums } from './Sums';
import Big from 'big.js';
import { AccountType } from '../model/AccountType';
import { Sum } from '../model/Sum';
import { AccountStatus } from '../model/AccountStatus';
import { Account } from '../model/Account';
import { Booking } from '../model/Booking';

const logger = pino({ level: 'debug' });
const accounts = {} as any;
const bookingsRepository = {} as any;
const fromDate = new Date(1);
const toDate = new Date(2);
const testToAccount = new Account('123e4567-e89b-12d3-a456-426614174010',
  'owner', 'name', AccountType.CASH, AccountStatus.OPEN);
const testFromAccount = new Account('123e4567-e89b-12d3-a456-426614174020',
  'owner', 'name', AccountType.CASH, AccountStatus.OPEN);
const testBooking = new Booking('123e4567-e89b-12d3-a456-426614174000', 'owner',
  testFromAccount, testToAccount, new Date(), new Big(1.0), 'test');
const testSum = new Sum('123e4567-e89b-12d3-a456-426614174000', 1,
  testBooking, testToAccount, testFromAccount, new Big(10));

describe('Sums', () => {
  it('can construct', () => {
    const sumRepository = {} as any;
    const target = new Sums(logger, accounts, bookingsRepository, sumRepository);

    expect(target).toBeTruthy();
  });

  it('getSums balance', async () => {
    const sumRepository = { getLatestSums: jest.fn(() => [ testSum ]) } as any;
    const target = new Sums(logger, accounts, bookingsRepository, sumRepository);

    const result = await target.getSums('owner', fromDate, toDate, AccountType.CASH);

    expect(result).toStrictEqual([ testSum ]);
    expect(sumRepository.getLatestSums).toBeCalledWith('owner', toDate, AccountType.CASH);
  });

  it('getSums income no previous', async () => {
    const sumRepository = { getLatestSums: jest.fn(
      (ignored: string, date: Date) => (date === toDate ? [ testSum ] : [])),
    } as any;
    const target = new Sums(logger, accounts, bookingsRepository, sumRepository);

    const result = await target.getSums('owner', fromDate, toDate, AccountType.REVENUE);

    expect(result).toStrictEqual([ testSum ]);
    expect(sumRepository.getLatestSums).toBeCalledWith('owner', toDate, AccountType.REVENUE);
    expect(sumRepository.getLatestSums).toBeCalledWith('owner', fromDate, AccountType.REVENUE);
  });

  it('getSums income no actual', async () => {
    const sumRepository = { getLatestSums: jest.fn(() => [ testSum ]) } as any;
    const target = new Sums(logger, accounts, bookingsRepository, sumRepository);

    const result = await target.getSums('owner', fromDate, toDate, AccountType.REVENUE);

    expect(result).toStrictEqual([]);
    expect(sumRepository.getLatestSums).toBeCalledWith('owner', toDate, AccountType.REVENUE);
    expect(sumRepository.getLatestSums).toBeCalledWith('owner', fromDate, AccountType.REVENUE);
  });

  it('getSums income difference', async () => {
    const before = new Sum('123e4567-e89b-12d3-a456-426614174003', 1,
      testBooking, testToAccount, testFromAccount, new Big(3));
    const sumRepository = { getLatestSums: jest.fn(
      (ignored: string, date: Date) => (date === toDate ? [ testSum ] : [ before ])),
    } as any;
    const target = new Sums(logger, accounts, bookingsRepository, sumRepository);

    const result = await target.getSums('owner', fromDate, toDate, AccountType.REVENUE);

    expect(result).toStrictEqual([
      new Sum(testSum.id, testSum.order,
        testSum.booking, testSum.account, testSum.otherAccount, new Big(7)),
    ]);
    expect(sumRepository.getLatestSums).toBeCalledWith('owner', toDate, AccountType.REVENUE);
    expect(sumRepository.getLatestSums).toBeCalledWith('owner', fromDate, AccountType.REVENUE);
  });
});
