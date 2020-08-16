import { AccountType } from './AccountType';
import { AccountStatus } from './AccountStatus';
import { validate } from 'uuid';
import { InvalidInputException } from '../exceptions/InvalidInputException';

export class Account {
  constructor(
        public readonly id: string,
        public readonly owner: string,
        public readonly name: string,
        public readonly type: AccountType,
        public readonly status: AccountStatus) {
    if (!validate(id)) {
      throw new InvalidInputException(`id must be a UUID but is ${ id }`);
    }
    if (name.length <= 3) {
      throw new InvalidInputException('name must be at least 3 chars');
    }
  }
}
