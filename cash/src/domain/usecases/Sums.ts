import { Sum } from '../model/Sum';
import { SumRepository } from '../port/persistance/SumRepository';
import { Accounts } from './Accounts';
import { Account } from '../model/Account';
import { AccountType, sumOnlyOverPeriod } from '../model/AccountType';
import { Booking } from '../model/Booking';
import { BookingRepository } from '../port/persistance/BookingRepository';
import { v4 as uuid } from 'uuid';
import { Logger } from 'pino';
import Big from 'big.js';


export class Page {
  constructor(
    public readonly pageNumber: number,
    public readonly pageSize: number) {}
}

export class Sums {
  constructor(
    private readonly logger: Logger,
    private readonly accounts: Accounts,
    private readonly bookingRepository: BookingRepository,
    private readonly sumRepository: SumRepository,
  ) {}

  async getSums(owner: string, fromDate: Date, toDate: Date, type: AccountType): Promise<Sum[]> {
    // Get the sums at the end of the period
    const after = (await this.sumRepository.getLatestSums(owner, toDate, type));

    if (!sumOnlyOverPeriod(type)) {
      return after;
    }

    // Get the sums at the beginning of the period
    const before = (await this.sumRepository.getLatestSums(owner, fromDate, type));

    // Compute the difference
    const sumMap = new Map<Account, Sum>();
    after.forEach((sum) => sumMap.set(sum.account, sum));
    before.forEach((sum) => {
      const oldSum = sumMap.get(sum.account);
      const newSum = new Sum(
        oldSum?.id ?? sum.id,
        oldSum?.order ?? sum.order,
        oldSum?.booking ?? sum.booking,
        sum.account,
        oldSum?.otherAccount ?? sum.otherAccount,
        oldSum?.amountAfter?.sub(sum.amountAfter) ?? sum.amountAfter.mul(-1),
      );
      if (newSum.amountAfter.abs().gt(new Big(0.01))) {
        sumMap.set(sum.account, newSum);
      } else {
        sumMap.delete(sum.account);
      }
    });

    // Convert to an array
    const result: Sum[] = [];
    sumMap.forEach((sum) => result.push(sum));
    return result;
  }

  async getJournal(accountId: string, owner: string, fromDate: Date, toDate: Date, page: Page): Promise<Sum[]> {
    const account = await this.accounts.getAccount(accountId, owner);
    return this.sumRepository.getSums(account, fromDate, toDate, page);
  }

  async recomputeSums(changedBooking: Booking, account: Account): Promise<void> {
    let oldSum = await this.sumRepository.getLastSumBefore(changedBooking, account);
    this.logger.info('Recompute sums for accoutn %s after booking %s', account, oldSum?.booking);
    await this.sumRepository.deleteAll(account, oldSum?.booking);
    const bookings = await this.bookingRepository.getAllForAccount(account, oldSum?.booking);
    for (const booking of bookings) {
      const newSum = Sums.computeNewSum(booking, account, oldSum);
      await this.sumRepository.create(newSum);
      oldSum = newSum;
    }
  }

  private static computeNewSum(booking: Booking, account: Account, oldSum?: Sum): Sum {
    if (booking.from === booking.to) {
      // This is a booking from itself, this will not change the afterAmount
      return new Sum(
        uuid(),
        (oldSum?.order ?? 0) + 1,
        booking,
        account,
        account,
        oldSum?.amountAfter ?? new Big(0),
      );
    }

    const isFromAccount = booking.from === account;
    const otherAccount = isFromAccount ? booking.to : booking.from;
    const amountBefore = oldSum?.amountAfter ?? new Big(0);
    const amountToAdd = isFromAccount ? booking.amount.mul(-1) : booking.amount;
    const amountAfter = amountBefore.plus(amountToAdd);
    return new Sum(
      uuid(),
      (oldSum?.order ?? 0) + 1,
      booking,
      account,
      otherAccount,
      amountAfter,
    );
  }
}
