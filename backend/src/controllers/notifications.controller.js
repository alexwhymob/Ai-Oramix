import { getWebPushPublicKey, removePushSubscription, savePushSubscription } from '../services/pushNotification.service.js';

export function publicKey(_req, res) {
  const key = getWebPushPublicKey();
  if (!key) {
    res.status(503).json({ error: 'push_not_configured', message: 'Web Push is not configured' });
    return;
  }
  res.json({ publicKey: key });
}

export async function subscribe(req, res, next) {
  try {
    res.json(await savePushSubscription(req.user, req.body, req.get('user-agent')));
  } catch (error) {
    next(error);
  }
}

export async function unsubscribe(req, res, next) {
  try {
    res.json(await removePushSubscription(req.user, req.body?.endpoint));
  } catch (error) {
    next(error);
  }
}
