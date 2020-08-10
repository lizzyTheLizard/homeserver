import { Router } from 'express';

export interface Controller {
    basePath:string;
    getRouter(): Router;
}
