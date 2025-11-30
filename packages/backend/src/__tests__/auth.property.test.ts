import * as fc from 'fast-check';
import bcrypt from 'bcrypt';
import { buildApp } from '../app';
import { connectDatabase } from '../db/mongoose';
import { UserModel } from '../models/user.model';
import { authRoutes } from '../routes/auth.routes';
import mongoose from 'mongoose';

// Feature: thumbnail-generation-system, Property 1: Password hashing invariant
// Feature: thumbnail-generation-system, Property 2: JWT token issuance
// Feature: thumbnail-generation-system, Property 3: Token authorization
// Feature: thumbnail-generation-system, Property 4: Invalid credentials rejection
// Validates: Requirements 1.1, 1.2, 1.3, 1.4

describe('Authentication Property Tests', () => {
  let app: any;

  beforeAll(async () => {
    // Connect to test database
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/thumbnail-system-test';
    await mongoose.connect(mongoUrl);
    
    app = await buildApp();
    await app.register(authRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await app.close();
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});
  });

  // Property 1: Password hashing invariant
  // For any valid registration credentials, the stored password should be hashed
  test('Property 1: Password hashing invariant', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 6, maxLength: 20 }),
        async (email, password) => {
          // Register user
          const response = await app.inject({
            method: 'POST',
            url: '/api/auth/register',
            payload: { email, password },
          });

          if (response.statusCode === 201) {
            // Find user in database
            const user = await UserModel.findOne({ email });
            
            // Password should be hashed (not equal to plaintext)
            expect(user).toBeTruthy();
            expect(user!.passwordHash).not.toBe(password);
            
            // Should be a valid bcrypt hash
            expect(user!.passwordHash).toMatch(/^\$2[aby]\$.{56}$/);
            
            // Should be verifiable with bcrypt
            const isValid = await bcrypt.compare(password, user!.passwordHash);
            expect(isValid).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 2: JWT token issuance
  // For any registered user with valid credentials, login should return a valid JWT
  test('Property 2: JWT token issuance', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 6, maxLength: 20 }),
        async (email, password) => {
          // Register user
          const registerResponse = await app.inject({
            method: 'POST',
            url: '/api/auth/register',
            payload: { email, password },
          });

          if (registerResponse.statusCode === 201) {
            // Login
            const loginResponse = await app.inject({
              method: 'POST',
              url: '/api/auth/login',
              payload: { email, password },
            });

            expect(loginResponse.statusCode).toBe(200);
            const body = JSON.parse(loginResponse.body);
            
            // Should return a token
            expect(body.token).toBeTruthy();
            expect(typeof body.token).toBe('string');
            
            // Token should be decodable
            const decoded = app.jwt.verify(body.token);
            expect(decoded.email).toBe(email);
            expect(decoded.id).toBeTruthy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 3: Token authorization
  // For any valid JWT token, authenticated requests should succeed
  test('Property 3: Token authorization', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 6, maxLength: 20 }),
        async (email, password) => {
          // Register user
          const registerResponse = await app.inject({
            method: 'POST',
            url: '/api/auth/register',
            payload: { email, password },
          });

          if (registerResponse.statusCode === 201) {
            const { token } = JSON.parse(registerResponse.body);
            
            // Make authenticated request
            const meResponse = await app.inject({
              method: 'GET',
              url: '/api/auth/me',
              headers: {
                authorization: `Bearer ${token}`,
              },
            });

            expect(meResponse.statusCode).toBe(200);
            const body = JSON.parse(meResponse.body);
            expect(body.email).toBe(email);
            expect(body.id).toBeTruthy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 4: Invalid credentials rejection
  // For any invalid credentials, authentication should be rejected
  test('Property 4: Invalid credentials rejection', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 6, maxLength: 20 }),
        fc.string({ minLength: 6, maxLength: 20 }),
        async (email, correctPassword, wrongPassword) => {
          fc.pre(correctPassword !== wrongPassword);
          
          // Register user with correct password
          await app.inject({
            method: 'POST',
            url: '/api/auth/register',
            payload: { email, password: correctPassword },
          });

          // Try to login with wrong password
          const loginResponse = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: { email, password: wrongPassword },
          });

          expect(loginResponse.statusCode).toBe(401);
          const body = JSON.parse(loginResponse.body);
          expect(body.success).toBe(false);
          expect(body.error).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional test: Non-existent user rejection
  test('Property 4b: Non-existent user rejection', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 6, maxLength: 20 }),
        async (email, password) => {
          // Try to login without registering
          const loginResponse = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: { email, password },
          });

          expect(loginResponse.statusCode).toBe(401);
          const body = JSON.parse(loginResponse.body);
          expect(body.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
