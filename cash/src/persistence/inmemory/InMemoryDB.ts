import { Account } from '../../domain/model/Account';
import { Booking } from '../../domain/model/Booking';

export class InMemoryDB {
  public readonly accounts: Map<string, Account> = new Map<string, Account>();
  public readonly bookings: Map<string, Booking> = new Map<string, Booking>();
}
