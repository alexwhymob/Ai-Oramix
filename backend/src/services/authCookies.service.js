import { env } from '../config/env.js';

export const ACCESS_COOKIE_NAME = 'oramix_access_token';
export const REFRESH_COOKIE_NAME = 'oramix_refresh_token';

const ACCESS_MAX_AGE_SECONDS = 15 * 60;
const REFRESH_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function parseCookies(request) {
  const header = request?.headers?.cookie;
  if (!header) return {};

  return Object.fromEntries(
    header.split(';').map((part) => {
      const separator = part.indexOf('=');
      if (separator < 0) return ['', ''];
      const name = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      try {
        return [name, decodeURIComponent(value)];
      } catch {
        return ['', ''];
      }
    }).filter(([name]) => name)
  );
}

export function setAuthCookies(response, { accessToken, refreshToken }) {
  response.setHeader('Set-Cookie', [
    serializeCookie(ACCESS_COOKIE_NAME, accessToken, ACCESS_MAX_AGE_SECONDS),
    serializeCookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_MAX_AGE_SECONDS)
  ]);
}

export function clearAuthCookies(response) {
  response.setHeader('Set-Cookie', [
    serializeCookie(ACCESS_COOKIE_NAME, '', 0),
    serializeCookie(REFRESH_COOKIE_NAME, '', 0)
  ]);
}

function serializeCookie(name, value, maxAge) {
const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${maxAge}`,
    ...(maxAge === 0 ? ['Expires=Thu, 01 Jan 1970 00:00:00 GMT'] : []),
    `SameSite=${env.AUTH_COOKIE_SAMESITE}`
  ];

  if (env.AUTH_COOKIE_SECURE) {
    attributes.push('Secure');
  }

  if (env.AUTH_COOKIE_DOMAIN) {
    attributes.push(`Domain=${env.AUTH_COOKIE_DOMAIN}`);
  }

  return attributes.join('; ');
}
