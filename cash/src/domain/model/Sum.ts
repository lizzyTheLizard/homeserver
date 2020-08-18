import { Account } from './Account';
import Big from 'big.js';
import { InvalidInputException } from '../exceptions/InvalidInputException';
import { validate } from 'uuid';
import { Booking } from './Booking';

export class Sum {
  // eslint-disable-next-line max-params
  constructor(
        public readonly id: string,
        public readonly order: number,
        public readonly booking: Booking,
        public readonly account: Account,
        public readonly otherAccount: Account,
        public readonly amountAfter: Big,
  ) {
    if (!validate(id)) {
      throw new InvalidInputException(`id must be a UUID but is ${ id }`);
    }
  }
}
