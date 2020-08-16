import { Booking } from '../../model/Booking';

export interface BookingQueryRepository{
    find(id: string) : Promise<Booking | void>

    findAllForOwner(owner: string): Promise<Booking[]>
}
