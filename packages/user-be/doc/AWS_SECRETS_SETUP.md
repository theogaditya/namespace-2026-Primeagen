# AWS Secrets Manager Integration

## Overview
This application uses AWS Secrets Manager to securely store and retrieve sensitive configuration values in production environments.

## How It Works

### Local Development
1. Create a `.env` file in the `packages/user-be` directory (use `.env.example` as template)
2. The app will use local `.env` values
3. AWS Secrets Manager retrieval will be attempted but failures are non-fatal

### Production
1. All secrets are retrieved from AWS Secrets Manager
2. Secret Name: `sih-swaraj-user-be`
3. Region: `ap-south-2`
4. If secrets retrieval fails, the app will not start

## AWS Secrets Manager Setup

### 1. Install AWS CLI and Configure Credentials
```bash
# Install AWS CLI (if not already installed)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure credentials
aws configure
# Enter your AWS Access Key ID, Secret Access Key, Region (ap-south-2)
```

### 2. Create Secret in AWS Secrets Manager
```bash
# Create the secret with JSON format
aws secretsmanager create-secret \
  --name sih-swaraj-user-be \
  --region ap-south-2 \
  --description "Environment variables for SIH Swaraj User Backend" \
  --secret-string '{
    "PORT": "3000",
    "NODE_ENV": "production",
    "DATABASE_URL": "postgresql://user:password@host:5432/dbname",
    "frontend": "https://your-frontend.com",
    "backend": "https://your-backend.com",
    "worker": "https://your-worker.com",
    "frontend_admin": "https://your-admin-frontend.com",
    "backend_admin": "https://your-admin-backend.com",
    "JWT_SECRET": "my123"
  }'
```

### 3. Update Existing Secret
```bash
# Update secret values
aws secretsmanager update-secret \
  --secret-id sih-swaraj-user-be \
  --region ap-south-2 \
  --secret-string '{
    "PORT": "3000",
    "DATABASE_URL": "postgresql://updated-url",
    ...
  }'
```

### 4. View Secret (for verification)
```bash
# Retrieve secret value
aws secretsmanager get-secret-value \
  --secret-id sih-swaraj-user-be \
  --region ap-south-2
```

## Required IAM Permissions

Your AWS IAM role/user needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:ap-south-2:*:secret:sih-swaraj-user-be-*"
    }
  ]
}
```

## Environment Variables Stored in AWS Secrets Manager

The following variables should be stored in the secret:

| Key | Description | Example |
|-----|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `frontend` | Frontend URL for CORS | `https://app.example.com` |
| `backend` | Backend URL for CORS | `https://api.example.com` |
| `worker` | Worker URL for CORS | `https://worker.example.com` |
| `frontend_admin` | Admin frontend URL | `https://admin.example.com` |
| `backend_admin` | Admin backend URL | `https://admin-api.example.com` |
| `JWT_SECRET` | JWT signing secret | `my123` (change in production!) |

## Installation

```bash
# Install dependencies (includes AWS SDK)
cd packages/user-be
bun install
```

## Running the Application

### Development (uses local .env)
```bash
bun run dev
```

### Production (uses AWS Secrets Manager)
```bash
NODE_ENV=production bun run start
```

## Deployment Checklist

- [ ] AWS credentials configured on the server (IAM role or credentials file)
- [ ] Secret created in AWS Secrets Manager with name `sih-swaraj-user-be`
- [ ] IAM permissions granted for `secretsmanager:GetSecretValue`
- [ ] All required environment variables added to the secret
- [ ] `NODE_ENV` set to `production`
- [ ] Database URL updated to production database
- [ ] JWT_SECRET changed from default "my123" to a secure random string

## Troubleshooting

### "Failed to retrieve secrets from AWS Secrets Manager"
- Check AWS credentials: `aws sts get-caller-identity`
- Verify secret exists: `aws secretsmanager describe-secret --secret-id sih-swaraj-user-be --region ap-south-2`
- Check IAM permissions
- Verify region is correct (ap-south-2)

### "Secret string is empty"
- Ensure secret has a value: `aws secretsmanager get-secret-value --secret-id sih-swaraj-user-be --region ap-south-2`
- Update secret if needed

### Development mode ignores AWS secrets
- This is intentional! Local `.env` takes precedence in development
- To test AWS secrets locally: `NODE_ENV=production bun run dev`

## Security Best Practices

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Use strong JWT secrets** - Change "my123" in production!
3. **Rotate secrets regularly** - Use AWS Secrets Manager rotation
4. **Use IAM roles on EC2/ECS** - Don't use long-lived credentials
5. **Enable AWS CloudTrail** - Monitor secret access
6. **Use least privilege** - Only grant necessary IAM permissions
