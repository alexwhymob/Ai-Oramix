import { createApp } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';

const app = createApp();

try {
  await connectDb();

  app.listen(env.PORT, () => {
    console.log(`Oramix AI backend listening on port ${env.PORT}`);
  });
} catch (error) {
  console.error('Failed to start backend:', error.message);
  process.exit(1);
}
