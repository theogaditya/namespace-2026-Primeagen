import { PrismaClient } from "../prisma/generated/client/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Read-only Prisma client for the agents service.
 * Only exposes findMany, findUnique, findFirst, count, aggregate.
 * Blocks create/update/delete/upsert at the proxy level.
 */

const BLOCKED_METHODS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
]);

// Models that agents must NEVER access (admin-only data)
const BLOCKED_MODELS = new Set([
  "departmentMunicipalAdmin",
  "superMunicipalAdmin",
  "departmentStateAdmin",
  "superStateAdmin",
  "superAdmin",
]);

function createReadOnlyProxy(prisma: PrismaClient): PrismaClient {
  return new Proxy(prisma, {
    get(target, prop: string) {
      // Block admin models entirely
      if (BLOCKED_MODELS.has(prop)) {
        throw new Error(`[ReadOnlyPrisma] Access to model "${prop}" is blocked for agents.`);
      }

      const value = (target as any)[prop];

      // If it's a model delegate (has findMany etc), wrap it
      if (value && typeof value === "object" && typeof value.findMany === "function") {
        return new Proxy(value, {
          get(modelTarget: any, method: string) {
            if (BLOCKED_METHODS.has(method)) {
              return () => {
                throw new Error(
                  `[ReadOnlyPrisma] Write operation "${method}" is blocked. Agents have read-only DB access.`
                );
              };
            }
            return modelTarget[method];
          },
        });
      }

      return value;
    },
  });
}

class PrismaSingleton {
  private static instance: PrismaClient;

  static getClient(): PrismaClient {
    if (!this.instance) {
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error("DATABASE_URL is not defined in environment variables");
      }
      const adapter = new PrismaPg({ connectionString });
      const raw = new PrismaClient({ adapter });
      this.instance = createReadOnlyProxy(raw);
    }
    return this.instance;
  }
}

export function getPrisma(): PrismaClient {
  return PrismaSingleton.getClient();
}
