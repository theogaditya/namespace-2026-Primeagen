# AWS EKS Deployment — IIT Test

> **🚀 Quick Reference:**
>
> **Get Traefik Load Balancer Hostname:**
> `kubectl get svc -n default platform-traefik -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'`
>
> **Get ArgoCD Initial Password:**
> `kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d`
>


Deploy the IIT Test platform on **AWS EKS** (Elastic Kubernetes Service).

---

## Prerequisites

| Tool        | Version  | Install                                              |
|-------------|----------|------------------------------------------------------|
| AWS CLI     | ≥ 2.x    | `curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && unzip awscliv2.zip && sudo ./aws/install` |
| Terraform   | ≥ 1.3    | `brew install terraform` or [terraform.io](https://developer.hashicorp.com/terraform/downloads) |
| kubectl     | ≥ 1.28   | `curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"` |
| Helm        | ≥ 3.x    | `curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 \| bash` |
| Ansible     | ≥ 2.14   | `pip install ansible`                                |

Configure AWS credentials:
```bash
aws configure
# Enter: Access Key ID, Secret Access Key, Region (ap-south-1), Output (json)
```

---

## Quick Start (Step-by-Step)

### 1. Create the EKS Cluster (Terraform)

```bash
cd aws/terraform

# Initialise Terraform
terraform init

# Preview what will be created
terraform plan

# Create VPC + EKS cluster + node group (takes ~15 min)
terraform apply
```

### 2. Connect to the Cluster (Kubeconfig)

Use the provided setup script to create a **separate** kubeconfig that preserves your local K8s contexts:

```bash
chmod +x aws/scripts/setup-kubeconfig.sh
./aws/scripts/setup-kubeconfig.sh
```

This will:
1. Fetch EKS credentials into `~/.kube/.iitk8.config`
2. Show you the merge command to add the EKS context to your main config

**Merge into main config:**
```bash
cp ~/.kube/config ~/.kube/config.bak
KUBECONFIG=~/.kube/config:~/.kube/.iitk8.config kubectl config view --flatten > /tmp/merged-kubeconfig
mv /tmp/merged-kubeconfig ~/.kube/config
```

**Or use EKS config in isolation:**
```bash
export KUBECONFIG=~/.kube/.iitk8.config
kubectl get nodes
```

### 3. Deploy the Full Platform (Ansible)

```bash
cd aws

# Full deployment: Terraform + Helm + K8s manifests
ansible-playbook -i inventory.ini aws-full-deploy.yml
```

Or step-by-step:

```bash
# Just the K8s platform setup (Helm charts, External Secrets)
ansible-playbook -i inventory.ini aws-k8s-platform-setup.yml
```

---

## Playbook Reference

| Playbook                      | Description                                                |
|-------------------------------|------------------------------------------------------------|
| `aws-full-deploy.yml`         | End-to-end: Terraform → EKS connect → Helm → K8s manifests |
| `aws-k8s-platform-setup.yml`  | Helm repos, platform chart, External Secrets, ArgoCD        |
| `aws-pre-push.yml`            | Run tests & builds before pushing code                      |
| `aws-run-all.yml`             | Start all microservices locally for development             |
| `aws-stop-all.yml`            | Stop all running microservices                               |
| `aws-prisma.yml`              | Run Prisma migrations and seed data                          |

**Usage:**
```bash
ansible-playbook -i inventory.ini <playbook-name>.yml
```

---

## Terraform Configuration

Edit `aws/terraform/terraform.tfvars` to customise:

```hcl
aws_region          = "ap-south-1"     # Mumbai
cluster_name        = "iit-test-eks"
node_instance_types = ["t3.medium"]
desired_nodes       = 2
min_nodes           = 1
max_nodes           = 4
```

---

## Secrets Setup

After deploying, create secrets in **AWS Secrets Manager** (region: `ap-south-1`):

| Secret Name                    | Description           |
|--------------------------------|-----------------------|
| `iit-user-be-prod`            | User backend env vars  |
| `iit-admin-be-prod`           | Admin backend env vars |
| `iit-comp-queue-prod`         | Comp queue env vars    |
| `iit-self-prod`               | Self service env vars  |

Also create `ansible/vars/secrets.yml` with your AWS credentials:
```yaml
aws_access_key_id: "YOUR_ACCESS_KEY"
aws_secret_access_key: "YOUR_SECRET_KEY"
```

---

## Useful Commands

```bash
# Switch kubectl context
kubectl config get-contexts
kubectl config use-context <context-name>

# Check cluster
kubectl get nodes
kubectl get pods -A

# Access ArgoCD
kubectl port-forward svc/argocd-server -n argocd 8080:443
# Username: admin
# Password: kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Get Traefik Load Balancer
kubectl get svc platform-traefik

# Destroy everything
cd aws/terraform && terraform destroy
```

---

## Architecture

```
aws/
├── terraform/                  # Infrastructure as Code
│   ├── providers.tf            # AWS provider config
│   ├── variables.tf            # Variable definitions
│   ├── terraform.tfvars        # User overrides
│   ├── vpc.tf                  # VPC, subnets, NAT, IGW
│   ├── eks.tf                  # EKS cluster, node groups, IAM
│   └── outputs.tf              # Cluster endpoints, commands
├── scripts/
│   └── setup-kubeconfig.sh     # Kubeconfig setup + merge
├── aws-full-deploy.yml         # Full deployment playbook
├── aws-k8s-platform-setup.yml  # Platform-only setup
├── aws-pre-push.yml            # CI checks
├── aws-run-all.yml             # Start dev services
├── aws-stop-all.yml            # Stop dev services
├── aws-prisma.yml              # DB migrations
├── inventory.ini               # Ansible inventory
└── README.md                   # This file
```
