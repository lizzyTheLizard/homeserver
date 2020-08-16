import { Account } from './Account';
import Big from 'big.js';
import { InvalidInputException } from '../exceptions/InvalidInputException';
import { validate } from 'uuid';

export class Booking {
  // eslint-disable-next-line max-params
  constructor(
        public readonly id: string,
        public readonly owner: string,
        public readonly from: Account,
        public readonly to: Account,
        public readonly date: Date,
        public readonly amount: Big,
        public readonly comment: string,
  ) {
    if (!validate(id)) {
      throw new InvalidInputException(`id must be a UUID but is ${ id }`);
    }
    if (comment.length <= 3) {
      throw new InvalidInputException('comment must be at least 3 chars');
    }
  }
}
