import { createApp } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { ensureDefaultMaturityPreset } from './services/maturity.service.js';
import { ensureDefaultNotificationTemplates } from './services/notificationTemplate.service.js';
import { ensureDefaultPresentationTemplate } from './services/presentationExport.service.js';
import { startAssessmentNotificationScheduler } from './services/assessmentNotification.service.js';
import { shutdownTelemetry } from './telemetry/instrumentation.js';
import { closeRateLimitStore, initializeRateLimitStore } from './services/rateLimitStore.service.js';

const app = createApp();

try {
  await initializeRateLimitStore();
  await connectDb();
  await ensureDefaultMaturityPreset();
  await ensureDefaultPresentationTemplate();
  await ensureDefaultNotificationTemplates();
  startAssessmentNotificationScheduler();

  const server = app.listen(env.PORT, () => {
    console.log(`Oramix AI backend listening on port ${env.PORT}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await shutdownTelemetry();
      await closeRateLimitStore();
      process.exit(0);
    });
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
} catch (error) {
  console.error('Failed to start backend:', error.message);
  process.exit(1);
}
