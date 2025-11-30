import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError, AuthenticatedUser } from '@thumbnail-system/shared';

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthenticatedUser;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
    const payload = request.user as any;
    
    request.user = {
      id: payload.id || payload.userId,
      email: payload.email,
    };
  } catch (error) {
    throw new AppError(401, 'Authentication required');
  }
}
