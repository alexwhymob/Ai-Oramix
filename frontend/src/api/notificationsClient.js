import { apiRequest } from './apiClient';

export async function enableBrowserNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    throw new Error('Browser notifications are not supported');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted');
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  const { publicKey } = await apiRequest('/notifications/public-key');
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey)
  });

  await apiRequest('/notifications/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription.toJSON())
  });

  return subscription;
}

export async function disableBrowserNotifications() {
  const registration = await navigator.serviceWorker.getRegistration('/sw.js');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  await apiRequest('/notifications/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ endpoint: subscription.endpoint })
  });
  await subscription.unsubscribe();
}

export async function getBrowserNotificationState() {
  const registration = await navigator.serviceWorker.getRegistration('/sw.js');
  return Boolean(await registration?.pushManager.getSubscription());
}

function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}
