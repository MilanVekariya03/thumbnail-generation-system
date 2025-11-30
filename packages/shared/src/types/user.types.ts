export interface User {
  _id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRegistrationRequest {
  email: string;
  password: string;
}

export interface UserLoginRequest {
  email: string;
  password: string;
}

export interface UserLoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

export interface AuthenticatedUser {
  id: string;
  email: string;
}
