# Staged Deployment - GitHub Clone Method

This deployment method provisions an EC2 instance, clones the repository from GitHub, and runs the 4 backend services directly using Bun.

## Overview

The `deploy-staged.yml` playbook performs the following:

1. **Terraform Phase**: Validates and applies Terraform configuration to provision EC2 instance
2. **System Setup**: Installs dependencies (git, curl, bun) and clones the repository
3. **Environment Setup**: Creates hardcoded `.env.production` files for each service
4. **Service Deployment**: Creates systemd services and starts all 4 backend processes

## Services Deployed

- `admin-be` - Admin Backend (port 3002)
- `comp-queue` - Complaint Queue (port 3005)
- `user-be` - User Backend (ports 3000, 3001)
- `self` - Self Service (port 3030)

Note: Frontend services (user-fe, admin-fe) are NOT deployed in this configuration.

## Prerequisites

- Ansible installed on your local machine
- AWS credentials configured
- SSH key pair at `ec2/.key/ec2-iit-pair`
- Terraform initialized in the `ec2/` directory

## Usage

```bash
# From the ec2/autoAnsi directory
ansible-playbook deploy-staged.yml

# Skip Terraform (if instance already exists)
ansible-playbook deploy-staged.yml -e skip_terraform=true
```

## Post-Deployment

### SSH into the instance
```bash
ssh -i ../key/ec2-iit-pair ubuntu@<INSTANCE_IP>
```

### Check service status
```bash
sudo systemctl status admin-be
sudo systemctl status comp-queue
sudo systemctl status user-be
sudo systemctl status self
```

### View service logs
```bash
sudo journalctl -u admin-be -f
sudo journalctl -u comp-queue -f
sudo journalctl -u user-be -f
sudo journalctl -u self -f
```

### Restart a service
```bash
sudo systemctl restart admin-be
```

### Manual service management
```bash
# Stop a service
sudo systemctl stop admin-be

# Start a service
sudo systemctl start admin-be

# Disable auto-start on boot
sudo systemctl disable admin-be
```

## Repository Location

The repository is cloned to: `/home/ubuntu/iit-test`

## Important Notes

⚠️ **SECURITY WARNING**: This file contains hardcoded secrets and should NOT be committed to GitHub.

The file is already added to `.gitignore` to prevent accidental commits.

## Troubleshooting

### Service won't start
Check the logs for errors:
```bash
sudo journalctl -u <service-name> -n 50
```

### Bun not found
Ensure Bun is installed and in PATH:
```bash
export BUN_INSTALL="/home/ubuntu/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
bun --version
```

### Repository not cloned
Manually clone:
```bash
cd /home/ubuntu
git clone https://github.com/theogaditya/iit-test.git
cd iit-test
bun install
```

### Environment variables not loaded
Check the .env.production files exist:
```bash
ls -la /home/ubuntu/iit-test/packages/*/env.production
```
