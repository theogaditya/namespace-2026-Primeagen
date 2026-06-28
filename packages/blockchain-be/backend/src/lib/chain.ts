import { ethers } from "ethers";
import { env } from "./env.js";

let provider: ethers.JsonRpcProvider | null = null;

export function getProvider(): ethers.JsonRpcProvider | null {
  if (!env.BLOCKCHAIN_RPC_URL) {
    return null;
  }

  if (!provider) {
    provider = new ethers.JsonRpcProvider(env.BLOCKCHAIN_RPC_URL);
  }

  return provider;
}
