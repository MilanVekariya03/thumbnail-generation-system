import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '@thumbnail-system/shared';

export async function errorHandler(
  error: FastifyError | AppError,
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  console.error('Error:', error);

  // Handle AppError
  if (error instanceof AppError) {
    reply.status(error.statusCode).send({
      success: false,
      error: error.message,
      message: error.message,
      statusCode: error.statusCode,
    });
    return;
  }

  // Handle Fastify validation errors
  if (error.validation) {
    reply.status(400).send({
      success: false,
      error: 'Validation Error',
      message: error.message,
      statusCode: 400,
      fields: error.validation,
    });
    return;
  }

  // Handle JWT errors
  if (error.message.includes('jwt') || error.message.includes('token')) {
    reply.status(401).send({
      success: false,
      error: 'Authentication Error',
      message: 'Invalid or expired token',
      statusCode: 401,
    });
    return;
  }

  // Default error
  const statusCode = error.statusCode || 500;
  reply.status(statusCode).send({
    success: false,
    error: 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
    statusCode,
  });
}
