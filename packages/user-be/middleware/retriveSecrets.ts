import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const SECRET_NAME = process.env.SECRET_NAME_AWS_USER_BE || "sih-swaraj-user-be";
const REGION = process.env.AWS_REGION || "ap-south-2";

// Create AWS Secrets Manager client with explicit credentials
const client = new SecretsManagerClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.SECRETS_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.SECRETS_AWS_SECRET_ACCESS_KEY!,
  },
});

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
 */
export async function retrieveAndInjectSecrets(): Promise<void> {
  try {
    console.log("[AWS Secrets] Retrieving secrets from AWS Secrets Manager...");
    
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
    // Only override if the value doesn't already exist (local .env takes precedence in dev)
    Object.entries(secrets).forEach(([key, value]) => {
      if (value !== undefined) {
        // In production, always use AWS secrets
        // In development, use AWS secrets only if local env var is not set
        if (process.env.NODE_ENV === "production" || !process.env[key]) {
          process.env[key] = value;
          console.log(`[AWS Secrets] Injected: ${key}`);
        } else {
          console.log(`[AWS Secrets] Skipped (local override): ${key}`);
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
}

/**
 * Initialize secrets synchronously (for testing or when secrets are already loaded)
 */
export function getSecretsClient(): SecretsManagerClient {
  return client;
}
