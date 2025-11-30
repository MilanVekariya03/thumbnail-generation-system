export interface ApiError {
  success: false;
  error: string;
  message: string;
  statusCode: number;
}

export interface ValidationError extends ApiError {
  fields?: Record<string, string>;
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
