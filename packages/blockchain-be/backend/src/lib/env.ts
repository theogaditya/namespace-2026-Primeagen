import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BACKEND_SYNC_TOKEN: z.string().min(1, "BACKEND_SYNC_TOKEN is required"),
  ETHERSCAN_TX_BASE_URL: z.string().default("https://sepolia.etherscan.io/tx/"),
  BLOCKCHAIN_RPC_URL: z.string().optional(),
  BLOCKCHAIN_CONTRACT_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "BLOCKCHAIN_CONTRACT_ADDRESS must be a valid 0x address")
    .optional(),
});

export const env = EnvSchema.parse(process.env);
