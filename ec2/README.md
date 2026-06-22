## Single Instance Architecture

```bash
ssh -i your-key.pem ubuntu@<IP_ADDRESS>
```

```bash
sudo apt update
sudo apt install awscli jq -y
```

#### AWS Secrets IAM
```bash
aws configure
```

```bash
aws secretsmanager get-secret-value \
  --secret-id sih-swaraj-admin-be-prod \
  --region ap-south-2 \
  --query SecretString \
  --output text | jq -r '
{
  NODE_ENV: "production",
  SECRETS_AWS_ACCESS_KEY_ID: .SECRETS_AWS_ACCESS_KEY_ID,
  SECRETS_AWS_SECRET_ACCESS_KEY: .SECRETS_AWS_SECRET_ACCESS_KEY,
  AWS_REGION: .AWS_REGION,
  SECRET_NAME_AWS_USER_BE: "sih-swaraj-admin-be-prod"
}
| to_entries
| map("\(.key)=\(.value)")
| .[]' > admin.env
```

```bash
aws secretsmanager get-secret-value \
  --secret-id sih-swaraj-comp-queue-prod \
  --region ap-south-2 \
  --query SecretString \
  --output text | jq -r '
{
  NODE_ENV: "production",
  SECRETS_AWS_ACCESS_KEY_ID: .SECRETS_AWS_ACCESS_KEY_ID,
  SECRETS_AWS_SECRET_ACCESS_KEY: .SECRETS_AWS_SECRET_ACCESS_KEY,
  AWS_REGION: .AWS_REGION,
  SECRET_NAME_AWS_USER_BE: "sih-swaraj-comp-queue-prod"
}
| to_entries
| map("\(.key)=\(.value)")
| .[]' > comp.env

```

```bash
aws secretsmanager get-secret-value \
  --secret-id sih-swaraj-user-be-prod \
  --region ap-south-2 \
  --query SecretString \
  --output text | jq -r '
{
  NODE_ENV: "production",
  SECRETS_AWS_ACCESS_KEY_ID: .SECRETS_AWS_ACCESS_KEY_ID,
  SECRETS_AWS_SECRET_ACCESS_KEY: .SECRETS_AWS_SECRET_ACCESS_KEY,
  AWS_REGION: .AWS_REGION,
  SECRET_NAME_AWS_USER_BE: "sih-swaraj-user-be-prod",
  DATABASE_URL: .DATABASE_URL,
  REDIS_URL: .REDIS_URL,
}
| to_entries
| map("\(.key)=\(.value)")
| .[]' > user.env
```

```bash
aws secretsmanager get-secret-value \
  --secret-id sih-swaraj-self-prod \
  --region ap-south-2 \
  --query SecretString \
  --output text | jq -r 'to_entries|map("\(.key)=\(.value)")|.[]' > self.env
```

#### Run Containers Manually

##### [NOTE: REMOVE ANY EXISTING CONTAINERS]
```bash
sudo docker rm -f admin-be comp-queue self user-be
```

```bash
sudo docker run -d \
  --name admin-be \
  --env-file admin.env \
  -p 3002:3002 \
  ogadityahota/sih-swarajdesk-admin-be:latest
```

```bash
sudo docker run -d \
  --name comp-queue \
  --env-file comp.env \
  -p 3005:3005 \
  ogadityahota/swarajdesk-comp-queue:latest
```

```bash
sudo docker run -d \
  --name user-be \
  --env-file user.env \
  -p 3000:3000 \
  -p 3001:3001 \
  ogadityahota/swarajdesk-user-be:latest
```

```bash
sudo docker run -d \
  --name self \
  --env-file self.env \
  -p 3030:3030 \
  ogadityahota/swarajdesk-self:latest
```

##### [TEST OUT NGINX-DNS]
```bash
curl -H "Host: iit-bbsr-swaraj-admin-be.adityahota.online" http://localhost:3002
```

### [CLEAN-UP SSH-Key]
##### Do this if stuck at SSH-Handshake

```bash
ssh-keygen -R <IP_ADDRESS>
```


### Automated Deployment Commands

#### [NOTE: RUN THESE COMMANDS FROM THE `ec2` DIRECTORY]
#### [SEPARATION OF CONCERN (SANITY)]
``` bash
cd ec2 \
terraform apply
```

``` bash
ansible-playbook -i ansible/inventory.ini ansible/playbook.yml
```

``` bash
ansible-playbook -i ansible/inventory.ini ansible/containers.yml
```

---

### One-Shot Deployment — `autoAnsible.sh` (Bash)

> A Bash script that runs the full pipeline with colour-coded terminal output.

```bash
# Run from the ec2/ directory
cd ec2

# Full deploy (terraform + ansible)
./autoAnsible.sh

# Skip terraform (instance already running, re-deploy ansible only)
./autoAnsible.sh --skip-terraform

# Dry run (preview steps without executing)
./autoAnsible.sh --dry-run
```

**What it does (7 steps):**
1. `terraform validate`
2. `terraform apply -auto-approve`
3. Extract IP from `terraform output`
4. Update `ansible/inventory.ini` with new IP
5. Poll SSH until instance is reachable (~5 min max)
6. Run `ansible-playbook … playbook.yml`
7. Run `ansible-playbook … containers.yml`

---

### One-Shot Deployment — `autoAnsi/deploy.yml` (Ansible)

> A single Ansible playbook that does **everything** — terraform + system setup + container deploy — in one command. No manual steps.

```bash
# Run from the ec2/autoAnsi/ directory
cd ec2/autoAnsi

# Full deploy (terraform + ansible)
ansible-playbook deploy.yml

# Skip terraform (instance already exists)
ansible-playbook deploy.yml -e skip_terraform=true

# Dry run (Ansible check mode)
ansible-playbook deploy.yml --check
```

**Plays inside `deploy.yml`:**

| Play | Runs on | What it does |
|------|---------|-------------|
| Play 1 | localhost | Terraform validate → apply → extract IP → update inventory → SSH wait |
| Play 2 | EC2 instance | Install Docker, Nginx, pull images, configure reverse proxy |
| Play 3 | EC2 instance | Configure AWS creds, generate env files, deploy all 4 containers |
| Play 4 | localhost | Print deployment summary with IP, SSH command, and service URLs |

**After deployment, SSH into the instance:**
```bash
ssh -i .key/ec2-iit-pair ubuntu@<IP from output>
```

**Update DNS records (Only):**
```bash
ansible-playbook deploy.yml -e dns_only=true
```

### See Logs
```bash
ssh -i .key/ec2-iit-pair ubuntu@<IP_ADDRESS>
```

```bash
cd /root

cat admin.env
cat comp.env
cat user.env
cat self.env

docker logs -f admin-be
docker logs -f comp-queue
docker logs -f user-be
docker logs -f self
```

### Get Cloudflare DNS Records
curl -X GET "https://api.cloudflare.com/client/v4/zones/<zone_id>/dns_records" \
-H "Authorization: Bearer <API_KEY>" \
-H "Content-Type: application/json"