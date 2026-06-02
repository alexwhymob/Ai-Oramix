import { Router } from 'express';
import { forgotPassword, login, logout, me, register, resetPassword } from '../controllers/auth.controller.js';

export const authRouter = Router();

authRouter.post('/login', login);
authRouter.post('/register', register);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);
authRouter.get('/me', me);
authRouter.post('/logout', logout);
