import { Request, Response, Router as ExpressRouter } from 'express';
import { Logger } from 'pino';
import { Router } from '@awaitjs/express';
import { Controller } from './Controller';
import { getRequiredField } from './getRequiredField';
import { Bookings } from '../domain/usecases/Bookings';
import { Booking } from '../domain/model/Booking';

export class BookingController implements Controller {
  // TODO Check if correct owner
  private readonly owner: string = 'testuser';
  readonly basePath: string = '/bookings';

  constructor(
        private readonly logger: Logger,
        private readonly manageBookings: Bookings) {}

  getRouter(): ExpressRouter {
    this.logger.info('Setup BookingController');
    const router = Router();
    router.getAsync('/', (req, res) => this.getAll(req, res));
    router.getAsync('/:id', (req, res) => this.getSingle(req, res));
    router.postAsync('/', (req, res) => this.create(req, res));
    router.putAsync('/:id', (req, res) => this.update(req, res));
    router.deleteAsync('/:id', (req, res) => this.delete(req, res));
    return router;
  }

  async getAll(req: Request, res: Response): Promise<void> {
    req.log.debug('Get All Bookings');
    const bookings = await this.manageBookings.getAll(this.owner);
    const response = bookings.map((booking) => BookingController.toResponseBody(booking));
    res.status(200).json(response).send();
  }

  async getSingle(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    req.log.debug('Get Booking %s', id);
    const booking = await this.manageBookings.getBooking(id, this.owner);
    const response = BookingController.toResponseBody(booking);
    res.status(200).json(response).send();
  }

  async create(req: Request, res: Response): Promise<void> {
    req.log.debug('Create new Booking');
    const newBooking = await this.manageBookings.create(
      getRequiredField(req, 'id'),
      this.owner,
      getRequiredField(req, 'from'),
      getRequiredField(req, 'to'),
      getRequiredField(req, 'date'),
      getRequiredField(req, 'amount'),
      getRequiredField(req, 'comment'),
    );
    const response = BookingController.toResponseBody(newBooking);
    res.status(200).json(response).send();
  }

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    req.log.debug('Update Booking %s', id);
    const newBooking = await this.manageBookings.update(id, this.owner,
      req.body.from as string,
      req.body.to as string,
      req.body.date as Date,
      req.body.amount as number,
      req.body.comment as string,
    );
    const response = BookingController.toResponseBody(newBooking);
    res.status(200).json(response).send();
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    req.log.debug('Delete Booking %s', id);
    await this.manageBookings.delete(id, this.owner);
    res.sendStatus(200);
  }

  private static toResponseBody(booking: Booking) : unknown {
    return {
      id: booking.id,
      from: booking.from.id,
      to: booking.to.id,
      date: booking.date,
      amount: booking.amount.toFixed(2),
      comment: booking.comment,
    };
  }
}
