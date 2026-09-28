import { connectDb, disconnectDb } from '../config/db.js';
import { registerUser } from '../services/auth.service.js';
import { User } from '../models/index.js';
import { stdin, stdout } from 'node:process';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = args.email;
  const fullName = args.name || 'Admin User';

  if (!email) {
    console.error('Usage: node src/scripts/createAdminUser.js --email <email> [--name "Full Name"]');
    process.exit(1);
  }

  const password = args.password || await promptPassword();
  if (!password) throw new Error('Password cannot be empty');

  await connectDb();

  try {
    const existing = await User.findOne({ email: email.toLowerCase() }).lean();
    if (existing) {
      console.log(`ADMIN_USER_EXISTS=${existing.email}`);
      return;
    }

    const result = await registerUser({
      email,
      password,
      full_name: fullName,
      role: 'admin'
    }, {
      allowRoleOverride: true
    });

    console.log(`ADMIN_USER_CREATED=${result.user.email}`);
    console.log(`ADMIN_USER_ID=${result.user.id}`);
  } finally {
    await disconnectDb();
  }
}

function promptPassword() {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('Password must be entered in an interactive terminal when --password is omitted');
  }

  return new Promise((resolve, reject) => {
    stdout.write('Admin password: ');
    stdin.setRawMode(true);
    stdin.resume();

    let password = '';
    const onData = (chunk) => {
      const character = chunk.toString('utf8');

      if (character === '\u0003') {
        cleanup();
        reject(new Error('Password input cancelled'));
      } else if (character === '\r' || character === '\n') {
        cleanup();
        stdout.write('\n');
        resolve(password);
      } else if (character === '\u007f' || character === '\b') {
        if (password.length) {
          password = password.slice(0, -1);
          stdout.write('\b \b');
        }
      } else if (character >= ' ') {
        password += character;
        stdout.write('*');
      }
    };

    function cleanup() {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
    }

    stdin.on('data', onData);
  });
}

function parseArgs(args) {
  const parsed = {};

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    const next = args[index + 1];

    if (current === '--email') parsed.email = next;
    if (current === '--password') parsed.password = next;
    if (current === '--name') parsed.name = next;
  }

  return parsed;
}

main().catch(error => {
  console.error(`ADMIN_USER_ERROR=${error.message}`);
  process.exit(1);
});
