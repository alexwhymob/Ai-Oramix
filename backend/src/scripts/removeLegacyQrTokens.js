import { connectDb, disconnectDb } from '../config/db.js';
import { Customer } from '../models/index.js';

async function removeLegacyQrTokens() {
  await connectDb();

  try {
    const result = await Customer.collection.updateMany(
      { qr_token: { $exists: true } },
      { $unset: { qr_token: '' } }
    );

    let indexDropped = false;
    try {
      await Customer.collection.dropIndex('qr_token_1');
      indexDropped = true;
    } catch (error) {
      if (![26, 27].includes(error.code) && !['NamespaceNotFound', 'IndexNotFound'].includes(error.codeName)) throw error;
    }

    console.log(JSON.stringify({
      legacyTokensRemoved: result.modifiedCount,
      qrTokenIndexDropped: indexDropped
    }));
  } finally {
    await disconnectDb();
  }
}

removeLegacyQrTokens().catch((error) => {
  console.error(`LEGACY_QR_MIGRATION_ERROR=${error.message}`);
  process.exit(1);
});
