require('dotenv').config();
const { runMigrations } = require('../lib/migrations');

async function main() {
  try {
    await runMigrations();
    console.log('Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();