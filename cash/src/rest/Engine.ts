import pino from 'pino';
import express from 'express';
import expressPino from 'express-pino-logger';
import { Controller } from './Controller';


export class Engine {
  public constructor(
        private readonly port : number,
        private readonly logger: pino.Logger,
        private readonly controllers: Controller[]) { }

  public run(): void{
    const pinoHttp: expressPino.Options = {
      logger: this.logger,
      customLogLevel: (res) => (res.statusCode >= 500 ? 'warn' : 'info'),
    };
    const app = express();
    app.use(express.json());
    app.use(expressPino(pinoHttp));
    this.controllers.forEach((cntl) => app.use(cntl.basePath, cntl.getRouter()));
    app.use(Engine.defaultHandler);
    app.use(Engine.errorHandler);
    app.listen(this.port, () => {
      this.logger.info(`Server running on port ${ this.port }`);
    });
  }

  private static defaultHandler(req: express.Request, res:express.Response) {
    req.log.info('URL %s not found', req.path);
    res.status(404).json({ 'error': 'Resource not found' });
  }

  private static errorHandler(err: Error, req: express.Request, res:express.Response, ignored: express.NextFunction) {
    res.err = err;
    res.status(500).json({ 'error': 'Something broke!' }).send();
  }
}
