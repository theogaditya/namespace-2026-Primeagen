# Deployment Summary

## What Was Done

### 1. Terraform Configuration Updated
- Region changed: `ap-south-1` → `ap-south-2`
- Instance type changed: `m7i-flex.large` → `t3.xlarge`
- Configuration validated successfully

### 2. New Staged Deployment Created
Created `deploy-staged.yml` - a new Ansible playbook that:
- Runs Terraform to provision EC2 instance
- Waits for SSH connectivity
- Clones the GitHub repository (https://github.com/theogaditya/iit-test.git)
- Installs Bun runtime
- Installs project dependencies
- Creates hardcoded `.env.production` files for all 4 services
- Sets up systemd services for automatic process management
- Starts all 4 backend services

### 3. Security Configuration
- Added `deploy-staged.yml` to `.gitignore` to prevent committing secrets
- File contains hardcoded credentials and should remain local only

## Services Deployed

The playbook deploys 4 backend services:
1. **admin-be** (port 3002) - Admin backend API
2. **comp-queue** (port 3005) - Complaint processing queue
3. **user-be** (ports 3000, 3001) - User backend API with WebSocket
4. **self** (port 3030) - Self service API

Frontend services (user-fe, admin-fe) are NOT included.

## How to Deploy

```bash
cd ec2/autoAnsi
ansible-playbook deploy-staged.yml
```

## Key Differences from Original deploy.yml

| Original | Staged |
|----------|--------|
| Uses pre-built Docker images | Clones repo and runs from source |
| Docker containers | Systemd services |
| Requires Docker registry | Requires GitHub access |
| Faster deployment | More flexible for development |

## Next Steps

After deployment completes:
1. SSH into the instance to verify services are running
2. Check service logs if needed: `sudo journalctl -u <service-name> -f`
3. Test the API endpoints at the instance IP
