import { AccountController } from './rest/AccountController';
import { Engine } from './rest/Engine';
import { InMemoryAccountRepository } from './persistence/inmemory/InMemoryAccountRepository';
import pino from 'pino';
import { ManageAccounts } from './domain/usecases/ManageAccounts';
import { ManageBookings } from './domain/usecases/ManageBookings';
import { BookingController } from './rest/BookingController';
import { InMemoryBookingRepository } from './persistence/inmemory/InMemoryBookingRepository';

const logger = pino({ level: 'debug' });
const accountRepository = new InMemoryAccountRepository();
const manageAccounts = new ManageAccounts(logger, accountRepository);
const accountController = new AccountController(logger, manageAccounts);
const bookingRepository = new InMemoryBookingRepository();
const manageBookings = new ManageBookings(logger, manageAccounts, bookingRepository);
const bookingController = new BookingController(logger, manageBookings);
const engine = new Engine(8080, logger, [ accountController, bookingController ]);
engine.run();
