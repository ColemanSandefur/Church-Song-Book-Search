import { drizzle } from 'drizzle-orm/better-sqlite3';
import { app } from 'electron';
import path from 'path';

import * as schema from '../src/db/schema';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createRequire } from 'module';

const require = createRequire(import.meta.url)

// Path to your app’s data folder (platform safe)
const dbPath = import.meta.env.DEV ? 'sqlite.db' : path.join(app.getPath('userData'), 'app.db');

// Create SQLite + Drizzle client
const sqlite = require('better-sqlite3')(dbPath);
export const db = drizzle(sqlite, { schema });

export const runMigrate = async () => {
  const migrations = path.join(process.env.APP_ROOT!, 'drizzle');
  console.log(migrations)
  migrate(db, {
    migrationsFolder: path.join(migrations)
  })
}

export const prepareDb = () => {
  return db;
}