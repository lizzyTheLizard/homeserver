import { AccountType } from './AccountType';
import { AccountStatus } from './AccountStatus';

export class Account {
  constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly owner: string,
        public readonly type: AccountType,
        public readonly status: AccountStatus) {
  }
}
