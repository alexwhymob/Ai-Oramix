import { getUserFromToken, loginUser, registerUser } from '../services/auth.service.js';

export async function login(req, res, next) {
  try {
    const result = await loginUser(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function register(req, res, next) {
  try {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const user = await getUserFromToken(token);
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function logout(_req, res) {
  res.json({ success: true });
}
