import { Sum } from '../../model/Sum';
import { AccountType } from '../../model/AccountType';
import { Page } from '../../usecases/Sums';
import { Account } from '../../model/Account';
import { Booking } from '../../model/Booking';

export interface SumRepository {
  create(newSum: Sum): Promise<void>;

  getLastSumBefore(changedBooking: Booking, account: Account): Promise<Sum | undefined>;

  getLatestSums(owner: string, at: Date, type: AccountType): Promise<Sum[]>;

  getSums(account: Account, from: Date, to: Date, page: Page): Promise<Sum[]>;

  deleteAll(account: Account, onlyAfter?: Booking) : Promise<void>
}
