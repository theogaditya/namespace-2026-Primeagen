import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Create hoisted mock for AWS SDK
const { mockSecretsManagerClient, mockGetSecretValueCommand, mockSend } = vi.hoisted(() => ({
  mockSecretsManagerClient: vi.fn(),
  mockGetSecretValueCommand: vi.fn(),
  mockSend: vi.fn(),
}));

// Mock AWS SDK
vi.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: mockSecretsManagerClient,
  GetSecretValueCommand: mockGetSecretValueCommand,
}));

// Mock dotenv
vi.mock('dotenv', () => ({
  default: {
    config: vi.fn(),
  },
}));

describe('Retrieve Secrets Middleware', () => {
  const originalEnv = { ...process.env };
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset process.env before each test
    process.env = { ...originalEnv };
    
    // Spy on console methods
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Setup mock client
    mockSecretsManagerClient.mockImplementation(() => ({
      send: mockSend,
    }));
    
    mockGetSecretValueCommand.mockImplementation((params: any) => params);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('retrieveAndInjectSecrets', () => {
    it('should log error when AWS credentials are missing in development mode', async () => {
      // Remove AWS credentials and ensure development mode
      delete process.env.SECRETS_AWS_ACCESS_KEY_ID;
      delete process.env.SECRETS_AWS_SECRET_ACCESS_KEY;
      process.env.NODE_ENV = 'development';

      // Reset modules to get fresh import
      vi.resetModules();
      
      const { retrieveAndInjectSecrets } = await import('../middleware/retriveSecrets');

      // In development mode, errors are logged but don't throw
      await retrieveAndInjectSecrets();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Continuing with local .env variables')
      );
    });

    it('should throw error when AWS credentials are missing in production', async () => {
      // Remove AWS credentials and set production mode
      delete process.env.SECRETS_AWS_ACCESS_KEY_ID;
      delete process.env.SECRETS_AWS_SECRET_ACCESS_KEY;
      process.env.NODE_ENV = 'production';

      vi.resetModules();
      
      const { retrieveAndInjectSecrets } = await import('../middleware/retriveSecrets');

      await expect(retrieveAndInjectSecrets()).rejects.toThrow(
        'Failed to retrieve secrets from AWS Secrets Manager in production'
      );
    });

    it('should retrieve and inject secrets into process.env', async () => {
      // Set AWS credentials
      process.env.SECRETS_AWS_ACCESS_KEY_ID = 'test-access-key';
      process.env.SECRETS_AWS_SECRET_ACCESS_KEY = 'test-secret-key';

      // Mock successful response
      mockSend.mockResolvedValue({
        SecretString: JSON.stringify({
          DATABASE_URL: 'postgres://test:test@localhost:5432/test',
          NODE_ENV: 'test',
          PORT: '3000',
        }),
      });

      vi.resetModules();
      const { retrieveAndInjectSecrets } = await import('../middleware/retriveSecrets');

      await retrieveAndInjectSecrets();

      // Verify secrets were injected
      expect(mockSend).toHaveBeenCalled();
    });

    it('should log error when secret string is empty in development mode', async () => {
      process.env.SECRETS_AWS_ACCESS_KEY_ID = 'test-access-key';
      process.env.SECRETS_AWS_SECRET_ACCESS_KEY = 'test-secret-key';
      process.env.NODE_ENV = 'development';

      mockSend.mockResolvedValue({
        SecretString: null,
      });

      vi.resetModules();
      const { retrieveAndInjectSecrets } = await import('../middleware/retriveSecrets');

      // Should not throw in development mode
      await retrieveAndInjectSecrets();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AWS Secrets] Error retrieving secrets:'),
        expect.any(Error)
      );
    });

    it('should throw error when secret string is empty in production', async () => {
      process.env.SECRETS_AWS_ACCESS_KEY_ID = 'test-access-key';
      process.env.SECRETS_AWS_SECRET_ACCESS_KEY = 'test-secret-key';
      process.env.NODE_ENV = 'production';

      mockSend.mockResolvedValue({
        SecretString: null,
      });

      vi.resetModules();
      const { retrieveAndInjectSecrets } = await import('../middleware/retriveSecrets');

      await expect(retrieveAndInjectSecrets()).rejects.toThrow(
        'Failed to retrieve secrets from AWS Secrets Manager in production'
      );
    });

    it('should log error when AWS call fails in development mode', async () => {
      process.env.SECRETS_AWS_ACCESS_KEY_ID = 'test-access-key';
      process.env.SECRETS_AWS_SECRET_ACCESS_KEY = 'test-secret-key';
      process.env.NODE_ENV = 'development';

      mockSend.mockRejectedValue(new Error('AWS error'));

      vi.resetModules();
      const { retrieveAndInjectSecrets } = await import('../middleware/retriveSecrets');

      // Should not throw in development mode
      await retrieveAndInjectSecrets();
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Continuing with local .env variables')
      );
    });

    it('should throw error when AWS call fails in production', async () => {
      process.env.SECRETS_AWS_ACCESS_KEY_ID = 'test-access-key';
      process.env.SECRETS_AWS_SECRET_ACCESS_KEY = 'test-secret-key';
      process.env.NODE_ENV = 'production';

      mockSend.mockRejectedValue(new Error('AWS error'));

      vi.resetModules();
      const { retrieveAndInjectSecrets } = await import('../middleware/retriveSecrets');

      await expect(retrieveAndInjectSecrets()).rejects.toThrow(
        'Failed to retrieve secrets from AWS Secrets Manager in production'
      );
    });

    it('should use default secret name and region', async () => {
      process.env.SECRETS_AWS_ACCESS_KEY_ID = 'test-access-key';
      process.env.SECRETS_AWS_SECRET_ACCESS_KEY = 'test-secret-key';
      delete process.env.SECRET_NAME_AWS_USER_BE;
      delete process.env.AWS_REGION;

      mockSend.mockResolvedValue({
        SecretString: JSON.stringify({ TEST_KEY: 'test-value' }),
      });

      vi.resetModules();
      const { retrieveAndInjectSecrets } = await import('../middleware/retriveSecrets');

      await retrieveAndInjectSecrets();

      // Verify client was created with default region
      expect(mockSecretsManagerClient).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'ap-south-2',
        })
      );
    });

    it('should use custom secret name and region from env', async () => {
      process.env.SECRETS_AWS_ACCESS_KEY_ID = 'test-access-key';
      process.env.SECRETS_AWS_SECRET_ACCESS_KEY = 'test-secret-key';
      process.env.SECRET_NAME_AWS_USER_BE = 'custom-secret';
      process.env.AWS_REGION = 'us-east-1';

      mockSend.mockResolvedValue({
        SecretString: JSON.stringify({ TEST_KEY: 'test-value' }),
      });

      vi.resetModules();
      const { retrieveAndInjectSecrets } = await import('../middleware/retriveSecrets');

      await retrieveAndInjectSecrets();

      expect(mockSecretsManagerClient).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'us-east-1',
        })
      );
    });
  });
});
