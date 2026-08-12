import webpush from 'web-push';
import { Assessment, Customer, PushSubscription, User } from '../models/index.js';
import { env } from '../config/env.js';

let configured = false;

export function getWebPushPublicKey() {
  if (!env.WEB_PUSH_VAPID_PUBLIC_KEY || !env.WEB_PUSH_VAPID_PRIVATE_KEY) {
    return null;
  }
  configureWebPush();
  return env.WEB_PUSH_VAPID_PUBLIC_KEY;
}

export async function savePushSubscription(user, subscription, userAgent) {
  validateSubscription(subscription);
  await PushSubscription.updateOne(
    { endpoint: subscription.endpoint },
    {
      $set: {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent || null,
        active: true,
        last_error_at: null
      }
    },
    { upsert: true, runValidators: true }
  );
  return { success: true };
}

export async function removePushSubscription(user, endpoint) {
  if (typeof endpoint !== 'string' || !endpoint.trim()) return { success: true };
  await PushSubscription.updateOne(
    { user_id: user.id, endpoint: endpoint.trim() },
    { $set: { active: false } }
  );
  return { success: true };
}

export async function notifyAssessmentSubmitted(assessmentId) {
  if (!getWebPushPublicKey()) return { sent: 0, skipped: true };

  const assessment = await Assessment.findOne({ id: assessmentId }).lean();
  if (!assessment) return { sent: 0, skipped: true };

  const customer = await Customer.findOne({ id: assessment.customer_id }).lean();
  const recipients = await User.find({
    active: true,
    $or: [
      { role: 'admin' },
      ...(customer?.account_manager_id ? [{ id: customer.account_manager_id }] : [])
    ]
  }).select('id').lean();

  const subscriptions = await PushSubscription.find({
    user_id: { $in: recipients.map((user) => user.id) },
    active: true
  }).lean();

  const payload = JSON.stringify({
    title: 'Nova submissao recebida',
    body: 'Uma avaliacao foi concluida e esta pronta para consulta.',
    url: `/admin/assessment/${assessment.id}`,
    assessmentId: assessment.id
  });

  let sent = 0;
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth }
      }, payload);
      sent += 1;
    } catch (error) {
      if ([404, 410].includes(error.statusCode)) {
        await PushSubscription.updateOne({ id: subscription.id }, { $set: { active: false, last_error_at: new Date() } });
      } else {
        await PushSubscription.updateOne({ id: subscription.id }, { $set: { last_error_at: new Date() } });
      }
    }
  }));

  return { sent, skipped: false };
}

function configureWebPush() {
  if (configured) return;
  webpush.setVapidDetails(env.WEB_PUSH_SUBJECT, env.WEB_PUSH_VAPID_PUBLIC_KEY, env.WEB_PUSH_VAPID_PRIVATE_KEY);
  configured = true;
}

function validateSubscription(subscription) {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    const error = new Error('A valid browser push subscription is required');
    error.status = 400;
    error.code = 'invalid_push_subscription';
    throw error;
  }
}
