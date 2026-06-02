// Generic/personal email domains not allowed for corporate registration
export const BLOCKED_EMAIL_DOMAINS = [
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.es', 'yahoo.it', 'yahoo.de', 'yahoo.com.br',
  'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.es', 'hotmail.it', 'hotmail.de',
  'outlook.com', 'outlook.pt', 'outlook.com.br',
  'live.com', 'live.co.uk', 'live.fr',
  'msn.com',
  'aol.com',
  'icloud.com', 'me.com', 'mac.com',
  'protonmail.com', 'proton.me',
  'mail.com', 'email.com',
  'sapo.pt', 'clix.pt', 'net.sapo.pt',
  'iol.pt',
  'terra.com.br', 'uol.com.br', 'bol.com.br', 'ig.com.br',
  'yandex.com', 'yandex.ru',
  'zoho.com',
  'tutanota.com',
  'gmx.com', 'gmx.net', 'gmx.de',
  'web.de',
  'inbox.com',
  'fastmail.com',
  'rediffmail.com',
];

export function isCorporateEmail(email) {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? !BLOCKED_EMAIL_DOMAINS.includes(domain) : false;
}