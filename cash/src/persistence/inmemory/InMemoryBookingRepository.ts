import { BookingRepository } from '../../domain/port/persistance/BookingRepository';
import { Booking } from '../../domain/model/Booking';
import { InMemoryDB } from './InMemoryDB';

export class InMemoryBookingRepository implements BookingRepository {
  constructor(private readonly db: InMemoryDB) {}

  create(booking: Booking): Promise<Booking> {
    this.db.bookings.set(booking.id, booking);
    return Promise.resolve(booking);
  }

  update(booking: Booking): Promise<Booking> {
    this.db.bookings.set(booking.id, booking);
    return Promise.resolve(booking);
  }

  delete(id: string): Promise<void> {
    this.db.bookings.delete(id);
    return Promise.resolve();
  }

  findAllForOwner(owner: string): Promise<Booking[]> {
    const result: Booking[] = [];
    this.db.bookings.forEach((booking) => {
      if (booking.owner === owner) {
        result.push(booking);
      }
    });
    return Promise.resolve(result);
  }

  find(id: string): Promise<Booking | undefined> {
    return Promise.resolve(this.db.bookings.get(id));
  }
}
