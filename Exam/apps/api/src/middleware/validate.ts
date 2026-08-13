import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './error';

export function validate(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          new AppError(
            400,
            'VALIDATION_FAILED',
            'Request validation failed',
            err.errors.map((e) => ({ path: e.path.join('.'), message: e.message }))
          )
        );
      }
      next(err);
    }
  };
}
