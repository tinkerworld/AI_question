import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '@repo/types';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string,
    public details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err.name === 'ZodError' || (err.issues && Array.isArray(err.issues))) {
    return res.status(400).json({
      success: false,
      errorCode: 'VALIDATION_ERROR',
      message: err.issues?.[0]?.message || 'Validation failed',
      details: err.issues,
    });
  }

  const statusCode = err.statusCode || 500;
  const response: ApiErrorResponse = {
    success: false,
    errorCode: err.errorCode || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected error occurred',
    details: err.details,
  };

  res.status(statusCode).json(response);
}
