import { BookingRepository } from '../../domain/port/persistance/BookingRepository';
import { Booking } from '../../domain/model/Booking';

export class InMemoryBookingRepository implements BookingRepository {
  private bookings: Map<string, Booking> = new Map<string, Booking>();

  create(booking: Booking): Promise<Booking> {
    this.bookings.set(booking.id, booking);
    return Promise.resolve(booking);
  }

  update(booking: Booking): Promise<Booking> {
    this.bookings.set(booking.id, booking);
    return Promise.resolve(booking);
  }

  delete(id: string): Promise<void> {
    this.bookings.delete(id);
    return Promise.resolve();
  }

  findAllForOwner(owner: string): Promise<Booking[]> {
    const result: Booking[] = [];
    this.bookings.forEach((booking) => {
      if (booking.owner === owner) {
        result.push(booking);
      }
    });
    return Promise.resolve(result);
  }

  find(id: string): Promise<Booking | undefined> {
    return Promise.resolve(this.bookings.get(id));
  }
}
