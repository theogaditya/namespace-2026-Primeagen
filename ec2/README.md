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
  SECRET_NAME_AWS_USER_BE: "sih-swaraj-user-be-prod"
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
ssh -i /home/abhas/node/Projects/iit-test/ec2/.key/ec2-iit-pair ubuntu@<IP_ADDRESS>
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
