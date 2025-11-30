import bcrypt from 'bcrypt';
import { UserModel } from '../models/user.model';
import { AppError, UserLoginResponse } from '@thumbnail-system/shared';
import { FastifyInstance } from 'fastify';

const SALT_ROUNDS = 10;

export class AuthService {
  constructor(private app: FastifyInstance) {}

  async register(email: string, password: string): Promise<UserLoginResponse> {
    // Check if user already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      throw new AppError(400, 'User with this email already exists');
    }

    // Validate password
    if (password.length < 6) {
      throw new AppError(400, 'Password must be at least 6 characters long');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await UserModel.create({
      email,
      passwordHash,
    });

    // Generate JWT token
    const token = this.app.jwt.sign({
      id: user._id.toString(),
      email: user.email,
    });

    return {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
      },
    };
  }

  async login(email: string, password: string): Promise<UserLoginResponse> {
    // Find user
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Generate JWT token
    const token = this.app.jwt.sign({
      id: user._id.toString(),
      email: user.email,
    });

    return {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
      },
    };
  }

  async verifyToken(token: string): Promise<{ id: string; email: string }> {
    try {
      const decoded = this.app.jwt.verify(token) as any;
      return {
        id: decoded.id,
        email: decoded.email,
      };
    } catch (error) {
      throw new AppError(401, 'Invalid or expired token');
    }
  }
}
