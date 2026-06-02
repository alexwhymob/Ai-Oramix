import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/index.js';

const TOKEN_EXPIRES_IN = '8h';
const PUBLIC_USER_FIELDS = 'id email full_name role created_date updated_date created_by_id';

export function requireJwtSecret() {
  if (!env.JWT_SECRET) {
    const error = new Error('JWT_SECRET is required');
    error.status = 500;
    error.code = 'missing_jwt_secret';
    throw error;
  }
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, passwordHash) {
  if (!passwordHash) return false;
  return bcrypt.compare(password, passwordHash);
}

export function signAuthToken(user) {
  requireJwtSecret();

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role
    },
    env.JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  );
}

export function verifyAuthToken(token) {
  requireJwtSecret();
  return jwt.verify(token, env.JWT_SECRET);
}

export async function registerUser({ email, password, full_name, role = 'account_manager' }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    const error = new Error('User already exists');
    error.status = 409;
    error.code = 'user_exists';
    throw error;
  }

  const password_hash = await hashPassword(password);
  const user = await User.create({
    email,
    full_name: full_name || email,
    role,
    password_hash
  });

  return createAuthResponse(user);
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() });
  const isValid = await verifyPassword(password, user?.password_hash);

  if (!user || !isValid) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    error.code = 'invalid_credentials';
    throw error;
  }

  return createAuthResponse(user);
}

export async function getUserFromToken(token) {
  const payload = verifyAuthToken(token);
  const user = await User.findOne({ id: payload.sub }).select(PUBLIC_USER_FIELDS);

  if (!user) {
    const error = new Error('User not found');
    error.status = 401;
    error.code = 'user_not_found';
    throw error;
  }

  return user.toJSON();
}

function createAuthResponse(user) {
  const token = signAuthToken(user);
  const jsonUser = user.toJSON();
  delete jsonUser.password_hash;

  return {
    access_token: token,
    user: jsonUser
  };
}
