import 'dotenv/config';
import { connectMongo, disconnectMongo, replaceAllData } from './mongo.js';
import { createInitialState } from './store.js';

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('<db_password>')) {
    throw new Error('Set a valid MONGODB_URI in server/.env before running seed.');
  }

  await connectMongo(uri);

  const seedState = createInitialState();
  await replaceAllData(seedState);

  console.log('MongoDB seed completed successfully.');
  console.log('Admin login: admin@example.com / admin123!');
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectMongo();
  });