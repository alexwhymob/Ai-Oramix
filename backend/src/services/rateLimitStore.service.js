import { createClient } from 'redis';
import { env } from '../config/env.js';

const INCREMENT_WITH_TTL_SCRIPT = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then
    redis.call('PEXPIRE', KEYS[1], ARGV[1])
  end
  return { count, redis.call('PTTL', KEYS[1]) }
`;

let client = null;
let connectPromise = null;

export async function initializeRateLimitStore() {
  if (!env.REDIS_URL) {
    if (env.RATE_LIMIT_REQUIRE_REDIS) {
      throw new Error('REDIS_URL is required when RATE_LIMIT_REQUIRE_REDIS is enabled');
    }
    return false;
  }

  await getClient();
  return true;
}

export async function incrementDistributedRateLimit(key, windowMs) {
  if (!env.REDIS_URL) return null;

  const redis = await getClient();
  const result = await redis.eval(INCREMENT_WITH_TTL_SCRIPT, {
    keys: [key],
    arguments: [String(windowMs)]
  });

  return {
    count: Number(result[0]),
    ttlMs: Math.max(0, Number(result[1]))
  };
}

export async function closeRateLimitStore() {
  if (client?.isOpen) {
    await client.quit();
  }
  client = null;
  connectPromise = null;
}

async function getClient() {
  if (!client) {
    client = createClient({ url: env.REDIS_URL });
    // Command errors are handled by the callers, but an error listener prevents
    // node-redis from turning a transient Redis error into an unhandled event.
    client.on('error', () => {});
  }

  if (!client.isReady) {
    if (!connectPromise) {
      connectPromise = client.connect().finally(() => {
        connectPromise = null;
      });
    }
    await connectPromise;
  }

  return client;
}
