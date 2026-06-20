# AWS-Infra — One-Command AWS EKS Deployment

Deploy the entire AWS infrastructure (VPC + EKS) **and** configure the Kubernetes platform with a single Ansible command.

---

## Prerequisites

| Tool          | Install                                              |
| ------------- | ---------------------------------------------------- |
| **Terraform** | [terraform.io/downloads](https://terraform.io/downloads) |
| **AWS CLI**   | `pip install awscli` or [docs](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) |
| **Ansible**   | `pip install ansible`                                |
| **kubectl**   | [kubernetes.io/docs](https://kubernetes.io/docs/tasks/tools/) |
| **Helm**      | `curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 \| bash` |

### AWS Credentials

Make sure your AWS credentials are configured:

```bash
aws configure
# or export:
export AWS_ACCESS_KEY_ID=<your-key>
export AWS_SECRET_ACCESS_KEY=<your-secret>
export AWS_DEFAULT_REGION=ap-south-1
```

### Ansible Vault Secrets

Ensure `ansible/vars/secrets.yml` contains:

```yaml
aws_access_key_id: "<YOUR_KEY>"
aws_secret_access_key: "<YOUR_SECRET>"
```

---

## Quick Start — Deploy Everything

```bash
cd ansible/AWS-Infra
ansible-playbook playbook.yml -i inventory.ini
```

That's it! This single command will:

1. **Terraform Init + Apply** — provisions VPC, subnets, NAT gateway, EKS cluster, and node group
2. **Connect to EKS** — updates your `~/.kube/config` automatically
3. **Install Helm charts** — Traefik, ArgoCD, External Secrets
4. **Deploy K8s manifests** — secrets, middlewares, deployments, ingresses
5. **Print final status** — pods, services, ingresses, ArgoCD credentials

---

## Customise Infrastructure

Edit `terraform/terraform.tfvars` before running:

```hcl
aws_region          = "ap-south-1"       # AWS region
cluster_name        = "iit-test-eks"     # EKS cluster name
node_instance_types = ["t3.small"]       # EC2 instance type
desired_nodes       = 2                  # Number of worker nodes
```

---

## Destroy Infrastructure

To tear everything down:

```bash
cd ansible/AWS-Infra
ansible-playbook destroy.yml -i inventory.ini
```

Or manually with Terraform:

```bash
cd ansible/AWS-Infra/terraform
terraform destroy -auto-approve
```
### Check for Lingering VPC's or Load Balancers

# Check for VPC (should return nothing or "Vpcs": [])
```
aws ec2 describe-vpcs --region ap-south-1 --filters "Name=tag:Project,Values=iit-test"
```

# Check for Load Balancers (should be empty array)
```
aws elbv2 describe-load-balancers --region ap-south-1 --query "LoadBalancers[?contains(LoadBalancerName, 'iit-test')]"
aws elb describe-load-balancers --region ap-south-1 --query "LoadBalancerDescriptions[?contains(LoadBalancerName, 'iit-test')]"
```

---

## Directory Structure

```
AWS-Infra/
├── playbook.yml          # Main one-command deployment playbook
├── destroy.yml           # Tear down all AWS infrastructure
├── inventory.ini         # Ansible inventory (localhost)
├── README.md             # This file
└── terraform/
    ├── providers.tf      # AWS provider config
    ├── variables.tf      # Configurable variables
    ├── terraform.tfvars  # Your overrides
    ├── vpc.tf            # VPC, subnets, NAT gateway
    ├── eks.tf            # EKS cluster, IAM roles, node group
    └── outputs.tf        # Cluster info outputs
```

---
## Useful Commands After Deployment

```bash
# Watch Terraform progress (in another terminal)
tail -f terraform/init.log
tail -f terraform/apply.log
tail -f terraform/destroy.log

# Check cluster status
kubectl cluster-info
kubectl get nodes

# Get Traefik external IP (for DNS)
kubectl get svc platform-traefik

# Get ArgoCD password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d; echo

# Port-forward ArgoCD
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

```bash
tail -f ansible/AWS-Infra/terraform/destroy.log
```


```bash
tail -f ansible/AWS-Infra/terraform/apply.log
```