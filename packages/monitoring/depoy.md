<!-- plan to deploy monitoring service on existing ec2 along side user-be, admin-be, comp-queue, self

## locally

Build and push the monitoring image:

```bash
cd packages/monitoring
sudo docker build --no-cache -t ogadityahota/swaraj-ec2-depy-monitor:latest .
docker push ogadityahota/swaraj-ec2-depy-monitor:latest
```

> Note: the image name must match the one used in `docker-compose.yml` (`ogadityahota/swaraj-ec2-depy-monitor:latest`). -->

## on ec2

Manual steps (without Ansible):

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip

docker pull ogadityahota/swaraj-ec2-depy-monitor:latest

mkdir -p ~/monitoring/data ~/monitoring/logs ~/monitoring/.key

# copy your EC2 SSH key used by the monitoring service
# (this path matches docker-compose.yml volume ./.key:/ec2-keys:ro)
cp /path/to/ec2-iit-pair ~/monitoring/.key/ec2-iit-pair
chmod 600 ~/monitoring/.key/ec2-iit-pair

cd ~/monitoring
nano .env            # configure environment vars for monitoring
nano docker-compose.yml
docker compose up -d
```

### Using Ansible (recommended)

From your local machine (project root), you can use the Ansible playbook to deploy/update the monitoring stack:

```bash
cd packages/monitoring/ansible

ansible-playbook \
  -i '18.61.119.62' \
  -u ubuntu \
  --private-key /packages/monitoring/.key/ec2-iit-pair \
  deploy-monitoring.yml
```

What the playbook does:
- ensures `~/monitoring` (and `data`, `logs`) exist on the EC2 instance
- copies `docker-compose.yml` from this repo to `~/monitoring/docker-compose.yml`
- optionally creates an empty `.env` if missing (you should edit it once)
- runs `docker compose up -d` in `~/monitoring`

You still need to:
- put the EC2 key used by the monitoring service at `~/monitoring/.key/ec2-iit-pair` on the server
- edit `~/monitoring/.env` with real values

setup nginx -- 
server {
    listen 80;
    server_name swaraj-monitoring.adityahota.online;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_read_timeout 300s;
    }
}

sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status nginx
set up dns (cloudflare)


