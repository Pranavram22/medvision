import { config } from 'dotenv';
import { seedDefaultUsers } from '../src/lib/seed';

// Load environment variables
config();

// Add environment variables to import.meta.env
(global as any).import = {
  meta: {
    env: process.env
  }
};

async function main() {
  try {
    await seedDefaultUsers();
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed database:', error);
    process.exit(1);
  }
}

main(); 