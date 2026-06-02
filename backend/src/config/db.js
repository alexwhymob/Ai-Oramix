import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDb() {
  if (!env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required to start the backend');
  }

  try {
    await mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB_NAME,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      family: 4
    });
  } catch (error) {
    throw normalizeMongoError(error);
  }
}

export async function disconnectDb() {
  await mongoose.disconnect();
}

function normalizeMongoError(error) {
  const message = error?.message || 'Unknown MongoDB connection error';

  if (/whitelist|IP address is not allowed|Could not connect to any servers in your MongoDB Atlas cluster/i.test(message)) {
    return new Error(
      'MongoDB Atlas rejected this connection. Add your current machine IP to Atlas Network Access and then restart the backend.'
    );
  }

  if (/querySrv ETIMEOUT|ENOTFOUND|ETIMEOUT/i.test(message)) {
    return new Error(
      'MongoDB Atlas DNS lookup failed or timed out. Check VPN/firewall/DNS, confirm Atlas Network Access, and if needed try the non-SRV connection string from Atlas.'
    );
  }

  return error;
}
