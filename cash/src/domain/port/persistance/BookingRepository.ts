import { Booking } from '../../model/Booking';
import { Account } from '../../model/Account';

export interface BookingRepository {
    getAllForAccount(account: Account, onlyAfter?: Booking) : Promise<Booking[]>;

    find(id: string) : Promise<Booking | void>

    findAllForOwner(owner: string): Promise<Booking[]>

    create(account: Booking): Promise<Booking>

    update(account: Booking): Promise<Booking>

    delete(id: string): Promise<void>
}
