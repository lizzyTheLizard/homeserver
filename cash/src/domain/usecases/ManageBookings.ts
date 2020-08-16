import { Booking } from '../model/Booking';
import { InvalidInputException } from '../exceptions/InvalidInputException';
import { validate } from 'uuid';
import { Logger } from 'pino';
import { BookingRepository } from '../port/persistance/BookingRepository';
import { NotFoundException } from '../exceptions/NotFoundException';
import { NotAllowedException } from '../exceptions/NotAllowedException';
import { Account } from '../model/Account';
import Big from 'big.js';

export interface GetAccounts {
  getAccount(fromAccountId: string, owner: string) : Promise<Account>;
}

export class ManageBookings {
  constructor(
    private readonly logger: Logger,
    private readonly getAccounts: GetAccounts,
    private readonly bookingRepository: BookingRepository) { }

  // eslint-disable-next-line max-params
  public async create(id: string, owner: string, fromAccountId: string, toAccountId: string,
    date: Date, amount: number, comment: string): Promise<Booking> {
    const fromAccount = await this.getAccounts.getAccount(fromAccountId, owner);
    const toAccount = await this.getAccounts.getAccount(toAccountId, owner);
    const bigAmount = new Big(amount);
    const newBooking = new Booking(id, owner, fromAccount, toAccount, date, bigAmount, comment);
    this.logger.info(newBooking, 'Create new booking');
    return this.bookingRepository.create(newBooking);
  }

  // eslint-disable-next-line max-params
  public async update(id: string, owner: string, newFromAccountId?: string, newToAccountId?: string,
    newDate?: Date, newAmount?: number, newComment?: string): Promise<Booking> {
    const oldBooking = await this.getBooking(id, owner);
    const newBooking = new Booking(
      oldBooking.id,
      oldBooking.owner,
      await this.getAccountOptional(newFromAccountId, owner, oldBooking.from),
      await this.getAccountOptional(newToAccountId, owner, oldBooking.to),
      newDate ?? oldBooking.date,
      new Big(newAmount ?? oldBooking.amount),
      newComment ?? oldBooking.comment,
    );
    this.logger.info(newBooking, 'Update booking');
    return this.bookingRepository.update(newBooking);
  }

  public async delete(id: string, owner: string): Promise<void> {
    await this.getBooking(id, owner);
    this.bookingRepository.delete(id);
  }

  async getBooking(bookingId: string, owner: string): Promise<Booking> {
    if (!bookingId || !validate(bookingId)) {
      throw new InvalidInputException(`Booking-ID must be a UUID but is ${ bookingId }`);
    }
    const booking = await this.bookingRepository.find(bookingId);
    if (!booking) {
      throw new NotFoundException(`No booking with ID ${ bookingId } could be found`);
    }
    if (booking.owner !== owner) {
      throw new NotAllowedException(`User ${ owner } cannot access account ${ bookingId }`);
    }
    return booking;
  }

  getAll(owner: string): Promise<Booking[]> {
    return this.bookingRepository.findAllForOwner(owner);
  }

  private getAccountOptional(id: string | undefined, owner: string, def: Account) : Promise<Account> {
    if (typeof id === 'undefined') {
      return Promise.resolve(def);
    }
    return this.getAccounts.getAccount(id, owner);
  }
}
