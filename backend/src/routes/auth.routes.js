import { Router } from 'express';
import { login, logout, me, register } from '../controllers/auth.controller.js';

export const authRouter = Router();

authRouter.post('/login', login);
authRouter.post('/register', register);
authRouter.get('/me', me);
authRouter.post('/logout', logout);
