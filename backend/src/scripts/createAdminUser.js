import { connectDb, disconnectDb } from '../config/db.js';
import { registerUser } from '../services/auth.service.js';
import { User } from '../models/index.js';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = args.email;
  const password = args.password;
  const fullName = args.name || 'Admin User';

  if (!email || !password) {
    console.error('Usage: node src/scripts/createAdminUser.js --email <email> --password <password> [--name "Full Name"]');
    process.exit(1);
  }

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
