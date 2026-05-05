import { PrismaClient } from '../prisma/generated/client/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ 
  connectionString: process.env.DATABASE_URL 
});

class PrismaSingleton {
  private static instance: PrismaClient;

  private constructor() {} 

  static getClient(): PrismaClient {
    if (!this.instance) {
      this.instance = new PrismaClient({ adapter });
    }
    return this.instance;
  }
}
  
export const prisma = PrismaSingleton.getClient();