import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDb() {
  if (!env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required to start the backend');
  }

  await mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DB_NAME
  });
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
