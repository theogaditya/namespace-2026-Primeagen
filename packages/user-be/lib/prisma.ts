import { PrismaClient } from "../prisma/generated/client/client";
import { PrismaPg } from "@prisma/adapter-pg";

class PrismaSingleton {
  private static instance: PrismaClient;

  private constructor() {}

  static getClient(): PrismaClient {
    if (!this.instance) {
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error("DATABASE_URL is not defined in environment variables");
      }
      const adapter = new PrismaPg({
        connectionString: connectionString,
      });
      this.instance = new PrismaClient({ adapter });
    }
    return this.instance;
  }
}
// export const prisma = PrismaSingleton.getClient();

export function getPrisma(): PrismaClient {
  return PrismaSingleton.getClient();
}
