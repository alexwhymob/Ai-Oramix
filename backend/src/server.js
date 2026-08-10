import { createApp } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { ensureDefaultMaturityPreset } from './services/maturity.service.js';
import { ensureDefaultNotificationTemplates } from './services/notificationTemplate.service.js';
import { ensureDefaultPresentationTemplate } from './services/presentationExport.service.js';

const app = createApp();

try {
  await connectDb();
  await ensureDefaultMaturityPreset();
  await ensureDefaultPresentationTemplate();
  await ensureDefaultNotificationTemplates();

  app.listen(env.PORT, () => {
    console.log(`Oramix AI backend listening on port ${env.PORT}`);
  });
} catch (error) {
  console.error('Failed to start backend:', error.message);
  process.exit(1);
}
