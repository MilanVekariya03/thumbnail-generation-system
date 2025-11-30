import { FastifyInstance } from 'fastify';
import { AuthService } from '../services/auth.service';
import { UserRegistrationRequest, UserLoginRequest } from '@thumbnail-system/shared';

export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app);

  // Register
  app.post<{ Body: UserRegistrationRequest }>('/api/auth/register', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.status(400).send({
        success: false,
        error: 'Validation Error',
        message: 'Email and password are required',
        statusCode: 400,
      });
    }

    const result = await authService.register(email, password);
    return reply.status(201).send(result);
  });

  // Login
  app.post<{ Body: UserLoginRequest }>('/api/auth/login', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.status(400).send({
        success: false,
        error: 'Validation Error',
        message: 'Email and password are required',
        statusCode: 400,
      });
    }

    const result = await authService.login(email, password);
    return reply.status(200).send(result);
  });

  // Verify token (for testing)
  app.get('/api/auth/me', {
    preHandler: async (request, reply) => {
      await request.jwtVerify();
    },
  }, async (request, reply) => {
    const user = request.user as any;
    return reply.send({
      id: user.id,
      email: user.email,
    });
  });
}
