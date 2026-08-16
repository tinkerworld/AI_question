import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './error';

export function validate(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (err: any) {
      if (err instanceof ZodError || err?.name === 'ZodError' || Array.isArray(err?.errors) || Array.isArray(err?.issues)) {
        const issues = err.errors || err.issues || [];
        return next(
          new AppError(
            400,
            'VALIDATION_FAILED',
            'Request validation failed',
            issues.map((e: any) => ({ path: e.path ? e.path.join('.') : '', message: e.message }))
          )
        );
      }
      next(err);
    }
  };
}
