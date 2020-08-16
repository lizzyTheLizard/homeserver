import { Booking } from '../../model/Booking';
import { BookingQueryRepository } from './BookingQueryRepository';

export interface BookingRepository extends BookingQueryRepository
{
    create(account: Booking): Promise<Booking>

    update(account: Booking): Promise<Booking>

    delete(id: string): Promise<void>
}
