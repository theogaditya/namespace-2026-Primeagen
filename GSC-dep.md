# SwarajDesk Deployment Guide

## Overview

This guide explains how to deploy the SwarajDesk backend stack on a fresh Ubuntu VM using:

* Docker
* Docker Compose
* Nginx reverse proxy
* Cloudflare DNS
* One VM
* No Docker Swarm
* No Traefik

This deployment exposes:

* user-be
* admin-be
* compqueue
* agents
* blockchain-be
* report-ai
* redis

---

# 1. VM Requirements

Minimum recommended VM specs:

* Ubuntu 24.04 LTS
* 4 vCPU
* 8 GB RAM
* 50+ GB disk
* Static public IP

Example VM:

* Public IP: `34.46.35.173`

---

# 2. Cloudflare DNS Setup

Create A records for all backend domains.

Example:

```txt
gsc-user-be.abhasbehera.in         -> 34.46.35.173
gsc-ws-user-be.abhasbehera.in      -> 34.46.35.173
gsc-admin-be.abhasbehera.in        -> 34.46.35.173
gsc-comp-queue.abhasbehera.in      -> 34.46.35.173
gsc-agents-be.abhasbehera.in       -> 34.46.35.173
gsc-blockchain-be.abhasbehera.in   -> 34.46.35.173
gsc-report-ai.abhasbehera.in       -> 34.46.35.173
```

Cloudflare proxy status should be enabled.

Important:

Cloudflare SSL mode must be:

```txt
Flexible
```

Path:

```txt
Cloudflare Dashboard -> SSL/TLS -> Overview -> Flexible
```

Why:

* Browser uses HTTPS
* Cloudflare connects to VM over HTTP
* Avoids needing SSL certificates on VM

---

# 3. SSH Into VM

```bash
gcloud compute ssh --zone "us-central1-f" "instance-20260418-102914" --project "free-proj-491816"
```

---

# 4. Clean Existing VM State

Create file:

```bash
nano clean-vm.sh
```

Paste:

```bash
#!/usr/bin/env bash
set -euo pipefail

sudo systemctl stop nginx || true
sudo systemctl stop docker || true
sudo systemctl stop containerd || true

sudo docker ps -aq | xargs -r sudo docker rm -f || true
sudo docker system prune -af --volumes || true
sudo docker network prune -f || true

sudo rm -rf /opt/swarajdesk
sudo rm -f /etc/nginx/sites-enabled/swarajdesk.conf
sudo rm -f /etc/nginx/sites-available/swarajdesk.conf
sudo rm -f /etc/nginx/sites-enabled/default

sudo apt-get purge -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin nginx nginx-common nginx-core || true
sudo apt-get autoremove -y --purge || true
sudo apt-get clean
```

Run:

```bash
chmod +x clean-vm.sh
./clean-vm.sh
sudo reboot
```

---

# 5. Install Docker, Compose, Nginx, and Utilities

Create file:

```bash
nano install-base.sh
```

Paste:

```bash
#!/usr/bin/env bash
set -euo pipefail

sudo apt-get update

sudo apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  nano \
  git \
  rsync \
  jq \
  unzip \
  zip \
  openssl \
  nginx

sudo mkdir -p /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update

sudo apt-get install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin

sudo systemctl enable docker
sudo systemctl enable nginx
sudo systemctl restart docker
sudo systemctl restart nginx

sudo usermod -aG docker $USER
```

Run:

```bash
chmod +x install-base.sh
./install-base.sh
```

Logout and SSH again.

Verify installation:

```bash
docker --version
docker compose version
nginx -v
```

---

# 6. Prepare Project Files

Directory layout:

```txt
/home/aditya/
  docker-compose.yml
  envs/
    user-be.env
    admin-be.env
    compqueue.env
    agents.env
    blockchain-be.env
    report-ai.env
```

Create env folder:

```bash
mkdir envs
cd envs
touch user-be.env admin-be.env compqueue.env agents.env blockchain-be.env report-ai.env
```

Fill each env file with the correct service variables.

---

# 7. Docker Compose File

Create:

```bash
nano ~/docker-compose.yml
```

Use the full compose file with:

* Redis
* user-be
* admin-be
* compqueue
* agents
* blockchain-be
* report-ai
* healthchecks
* env_file references
* restart policies

Important patterns:

```yaml
env_file: ./envs/user-be.env
```

```yaml
environment:
  REDIS_URL: redis://default:strongpassword@redis:6379
  REDIS_HOST: redis
  REDIS_PORT: "6379"
  REDIS_PASSWORD: strongpassword
```

---

# 8. Start Docker Stack

Run:

```bash
docker compose up -d
docker compose ps
```

Expected:

```txt
Up (healthy)
```

for most services.

---

# 9. Local Health Checks

Test services directly:

```bash
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1:3002/api/health
curl http://127.0.0.1:3005/health
curl http://127.0.0.1:3040/api/health
curl http://127.0.0.1:4100/health
curl http://127.0.0.1:8000/health
```

Expected:

* user-be returns JSON
* admin-be returns JSON
* compqueue returns JSON
* agents returns JSON
* blockchain-be returns JSON
* report-ai returns JSON

---

# 10. Nginx Reverse Proxy Setup

Create file:

```bash
sudo nano /etc/nginx/sites-available/swarajdesk.conf
```
server { listen 80; server_name gsc-user-be.abhasbehera.in; location / { proxy_pass http://127.0.0.1:3000; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; } } server { listen 80; server_name gsc-ws-user-be.abhasbehera.in; location / { proxy_pass http://127.0.0.1:3001; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; } } server { listen 80; server_name gsc-admin-be.abhasbehera.in; location / { proxy_pass http://127.0.0.1:3002; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; } } server { listen 80; server_name gsc-comp-queue.abhasbehera.in; location / { proxy_pass http://127.0.0.1:3005; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; } } server { listen 80; server_name gsc-agents-be.abhasbehera.in; location / { proxy_pass http://127.0.0.1:3040; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; } } server { listen 80; server_name gsc-blockchain-be.abhasbehera.in; location / { proxy_pass http://127.0.0.1:4100; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; } } server { listen 80; server_name gsc-report-ai.abhasbehera.in; location / { proxy_pass http://127.0.0.1:8000; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; } }
```

Repeat for:

* admin-be -> 3002
* compqueue -> 3005
* agents -> 3040
* blockchain-be -> 4100
* report-ai -> 8000

Enable config:

```bash
sudo ln -sf /etc/nginx/sites-available/swarajdesk.conf /etc/nginx/sites-enabled/swarajdesk.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

# 11. Test Nginx Routing

```bash
curl -H "Host: gsc-user-be.abhasbehera.in" http://127.0.0.1/api/health
curl -H "Host: gsc-admin-be.abhasbehera.in" http://127.0.0.1/api/health
curl -H "Host: gsc-comp-queue.abhasbehera.in" http://127.0.0.1/health
curl -H "Host: gsc-agents-be.abhasbehera.in" http://127.0.0.1/api/health
curl -H "Host: gsc-blockchain-be.abhasbehera.in" http://127.0.0.1/health
curl -H "Host: gsc-report-ai.abhasbehera.in" http://127.0.0.1/health
```

If these work, Nginx is routing correctly.

---

# 12. Firewall Rules

Ubuntu firewall:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

GCP firewall rules must also allow:

```txt
tcp:22
tcp:80
tcp:443
```

---

# 13. Common Problems and Fixes

## Problem: Docker Not Found

```txt
docker: No such file or directory
```

Fix:

Docker installation failed due to bad apt repo config.

Remove old repo files and reinstall Docker.

---

## Problem: Conflicting Docker Apt Keys

```txt
Conflicting values set for option Signed-By
```

Fix:

```bash
sudo rm -f /etc/apt/sources.list.d/download_docker_com_linux_ubuntu.list
sudo apt update
```

---

## Problem: Service 0/1 in Swarm

```txt
swarajdesk_user-be 0/1
```

Cause:

* bad env path
* missing env file
* container crash

Fix:

```bash
docker compose logs user-be --tail=100
```

---

## Problem: Cloudflare 521

Cause:

Cloudflare cannot reach VM.

Fix:

* ensure Nginx is running
* ensure port 80 is open
* ensure Cloudflare SSL mode is Flexible

---

## Problem: Nginx Returns "Cannot GET /"

Cause:

Backend does not expose `/`.

Example:

* user-be uses `/api/health`
* compqueue uses `/health`

This is normal.

---

## Problem: report-ai Shows Unhealthy

Cause:

Container healthcheck used curl, but curl was not installed inside the image.

Fix:

```yaml
healthcheck:
  test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 30s
```

Then:

```bash
docker compose up -d --force-recreate report-ai
```

---

# 14. Useful Debug Commands

Check containers:

```bash
docker compose ps
```

Check logs:

```bash
docker compose logs user-be --tail=100
docker compose logs admin-be --tail=100
docker compose logs compqueue --tail=100
docker compose logs agents --tail=100
docker compose logs blockchain-be --tail=100
docker compose logs report-ai --tail=100
```

Check ports:

```bash
sudo ss -tulpn | grep ':80\|:443\|:3000\|:3002\|:3005\|:3040\|:4100\|:8000'
```

Check Nginx:

```bash
sudo nginx -t
sudo systemctl status nginx
```

Restart Nginx:

```bash
sudo systemctl restart nginx
```

Restart all containers:

```bash
docker compose restart
```

Rebuild stack:

```bash
docker compose down
docker compose up -d
```

---

# 15. Final Expected Result

Working domains:

* gsc-user-be.abhasbehera.in
* gsc-ws-user-be.abhasbehera.in
* gsc-admin-be.abhasbehera.in
* gsc-comp-queue.abhasbehera.in
* gsc-agents-be.abhasbehera.in
* gsc-blockchain-be.abhasbehera.in
* gsc-report-ai.abhasbehera.in

All services should be:

```txt
Up (healthy)
```

# 12. Generate SSL Certificates

Since Cloudflare proxy is disabled (grey cloud), the VM itself must serve HTTPS.

Install Certbot:

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

Generate certificates for working domains:

```bash
sudo certbot --nginx \
  -d gsc-user-be.abhasbehera.in \
  -d gsc-ws-user-be.abhasbehera.in \
  -d gsc-admin-be.abhasbehera.in \
  -d gsc-comp-queue.abhasbehera.in \
  -d gsc-agents-be.abhasbehera.in \
  -d gsc-blockchain-be.abhasbehera.in
```

If one failing domain blocks the full request, generate certificates separately:

```bash
sudo certbot --nginx -d gsc-user-be.abhasbehera.in
sudo certbot --nginx -d gsc-ws-user-be.abhasbehera.in
sudo certbot --nginx -d gsc-admin-be.abhasbehera.in
sudo certbot --nginx -d gsc-comp-queue.abhasbehera.in
sudo certbot --nginx -d gsc-agents-be.abhasbehera.in
sudo certbot --nginx -d gsc-blockchain-be.abhasbehera.in
```

Verify HTTPS:

```bash
curl -I https://gsc-user-be.abhasbehera.in
curl -I https://gsc-ws-user-be.abhasbehera.in
curl -I https://gsc-admin-be.abhasbehera.in
curl -I https://gsc-comp-queue.abhasbehera.in
curl -I https://gsc-agents-be.abhasbehera.in
curl -I https://gsc-blockchain-be.abhasbehera.in
```

404 on `/` is normal if the backend does not expose a root route.

Use actual health routes instead:

```bash
curl https://gsc-user-be.abhasbehera.in/api/health
curl https://gsc-admin-be.abhasbehera.in/api/health
curl https://gsc-comp-queue.abhasbehera.in/health
curl https://gsc-agents-be.abhasbehera.in/api/health
curl https://gsc-blockchain-be.abhasbehera.in/health
```

For websocket support, ensure the websocket nginx block contains:

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 86400;
```

Also add inside `/etc/nginx/nginx.conf` under the `http {}` block:

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
```

Test nginx and restart:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

Certbot automatically installs certificate auto-renewal.

Test renewal:

```bash
sudo certbot renew --dry-run
```

