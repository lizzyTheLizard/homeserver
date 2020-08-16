export enum AccountType {
    CASH,
    ASSET,
    EQUITY,
    DEBT,
    REVENUE,
    EXTRA_REVENUE,
    SPENDING,
    EXTRA_SPENDING
}

export function mustSwitchSign(type: AccountType): boolean {
  switch (type) {
    case AccountType.CASH:
    case AccountType.ASSET:
      return false;
    case AccountType.EQUITY:
    case AccountType.DEBT:
      return true;
    case AccountType.REVENUE:
    case AccountType.EXTRA_REVENUE:
      return false;
    case AccountType.SPENDING:
    case AccountType.EXTRA_SPENDING:
      return true;
    default:
      throw new Error(`Invalid value ${ type } for account type`);
  }
}

export function sumOnlyOverPeriod(type: AccountType): boolean {
  switch (type) {
    case AccountType.CASH:
    case AccountType.ASSET:
    case AccountType.EQUITY:
    case AccountType.DEBT:
      return false;
      return true;
    case AccountType.REVENUE:
    case AccountType.EXTRA_REVENUE:
    case AccountType.SPENDING:
    case AccountType.EXTRA_SPENDING:
      return true;
    default:
      throw new Error(`Invalid value ${ type } for account type`);
  }
}
