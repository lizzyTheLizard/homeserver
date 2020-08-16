import { InvalidInputException } from '../domain/exceptions/InvalidInputException';
import { Request } from 'express';

export function getRequiredField<Type>(req: Request, fieldName: string) : Type {
  const value: unknown = req.body[fieldName];
  if (!value) {
    throw new InvalidInputException(`Field ${ fieldName } must be given`);
  }
  return value as Type;
}
