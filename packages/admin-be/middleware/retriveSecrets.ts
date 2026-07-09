import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import dotenv from "dotenv";
import path from "path";

// Load bootstrap credentials first (contains only AWS Secrets Manager credentials)
// This allows the app to work without a full .env file
const bootstrapPath = path.resolve(process.cwd(), ".env.bootstrap");
dotenv.config({ path: bootstrapPath });

const SECRET_NAME = process.env.SECRET_NAME_AWS_USER_BE || "sih-swaraj-user-be";
const REGION = process.env.AWS_REGION || "ap-south-2";

// Function to create AWS Secrets Manager client
function createSecretsClient(): SecretsManagerClient | null {
  const accessKeyId = process.env.SECRETS_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SECRETS_AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    console.warn("[AWS Secrets] AWS credentials not found in environment");
    console.warn("[AWS Secrets] Please ensure SECRETS_AWS_ACCESS_KEY_ID and SECRETS_AWS_SECRET_ACCESS_KEY are set");
    console.warn("[AWS Secrets] You can set them in .env.bootstrap or as environment variables");
    return null;
  }

  return new SecretsManagerClient({
    region: REGION,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

interface SecretValues {
  PORT?: string;
  DATABASE_URL?: string;
  NODE_ENV?: string;
  frontend?: string;
  backend?: string;
  worker?: string;
  frontend_admin?: string;
  backend_admin?: string;
  [key: string]: string | undefined;
}

/**
 * Retrieves secrets from AWS Secrets Manager and injects them into process.env
 * Should be called before any other initialization that depends on env variables
 * 
 * DISABLED: AWS Secrets Manager retrieval is disabled to prevent conflicts with local env files.
 * All configuration should come from env files or Docker ENV variables.
 */
export async function retrieveAndInjectSecrets(): Promise<void> {
  // ============================================================================
  // AWS SECRETS MANAGER DISABLED - Using local env files and Docker ENV instead
  // ============================================================================
  // This prevents timing issues where Redis clients are instantiated before
  // AWS secrets are loaded. Now REDIS_URL is set in Dockerfile and env files.
  // ============================================================================
  
  console.log("[AWS Secrets] DISABLED - Using local env files and Docker ENV variables");
  console.log("[AWS Secrets] REDIS_URL from env:", process.env.REDIS_URL);
  
  // Skip AWS Secrets Manager retrieval entirely
  return Promise.resolve();
  
  /* COMMENTED OUT - Original AWS Secrets Manager code
  try {
    console.log("[AWS Secrets] Retrieving secrets from AWS Secrets Manager...");

    // Create client when needed (after bootstrap env is loaded)
    const client = createSecretsClient();

    if (!client) {
      throw new Error("AWS Secrets Manager client could not be created - missing credentials");
    }

    const command = new GetSecretValueCommand({
      SecretId: SECRET_NAME,
    });

    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error("Secret string is empty");
    }

    // Parse the JSON secret string
    const secrets: SecretValues = JSON.parse(response.SecretString);

    // Inject secrets into process.env
    // Do not override any environment variable that is already set locally.
    // This ensures locally-provided secrets (or values supplied via docker-compose/env files)
    // take precedence over AWS Secrets Manager values, even in production.
    Object.entries(secrets).forEach(([key, value]) => {
      if (value !== undefined) {
        if (process.env[key]) {
          console.log(`[AWS Secrets] Skipped (local override): ${key}`);
        } else {
          process.env[key] = value;
          console.log(`[AWS Secrets] Injected: ${key}`);
        }
      }
    });

    console.log("[AWS Secrets] Successfully retrieved and injected secrets");
  } catch (error) {
    console.error("[AWS Secrets] Error retrieving secrets:", error);

    // In production, throw error to prevent app from starting without secrets
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Failed to retrieve secrets from AWS Secrets Manager in production"
      );
    }

    // In development, log warning but continue (use local .env)
    console.warn(
      "[AWS Secrets] Continuing with local .env variables (development mode)"
    );
  }
  */
}

/**
 * Initialize secrets synchronously (for testing or when secrets are already loaded)
 */
export function getSecretsClient(): SecretsManagerClient | null {
  return createSecretsClient();
}
