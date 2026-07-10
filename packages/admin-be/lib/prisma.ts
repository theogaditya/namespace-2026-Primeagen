import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from "../prisma/generated/client/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from 'pg';

// Load the package `.env` explicitly (so seeds work regardless of cwd)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

class PrismaSingleton {
  private static instance: PrismaClient;
  private static pool: pg.Pool;

  private constructor() {}

  static getClient(): PrismaClient {
    if (!this.instance) {
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error("DATABASE_URL is not defined in environment variables");
      }

      // Create a pg.Pool with explicit settings to avoid the pg@8
      // DeprecationWarning about concurrent client.query() calls.
      // Passing a Pool (instead of just a connectionString) lets the
      // adapter properly checkout separate clients for parallel work.
      this.pool = new pg.Pool({
        connectionString,
        max: 20,                // max simultaneous connections
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      this.pool.on('error', (err) => {
        console.error('[PG Pool] Unexpected idle client error:', err.message);
      });

      const adapter = new PrismaPg(this.pool);
      this.instance = new PrismaClient({ adapter });
    }
    return this.instance;
  }

  /** Gracefully shut down the pool (called on process exit). */
  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.$disconnect();
    }
    if (this.pool) {
      await this.pool.end();
    }
  }
}
// export const prisma = PrismaSingleton.getClient();

export function getPrisma(): PrismaClient {
  return PrismaSingleton.getClient();
}

export async function disconnectPrisma(): Promise<void> {
  return PrismaSingleton.disconnect();
}
