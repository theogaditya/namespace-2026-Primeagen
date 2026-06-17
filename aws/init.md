# EKS Infrastructure Lifecycle (Apply & Destroy)

This document contains the commands to provision and destroy the IIT Test EKS infrastructure.

## Prerequisites
- AWS CLI configured (`aws configure`)
- Terraform installed

## 1. Apply Infrastructure (Create Everything)

This creates the VPC, Subnets, EKS Cluster, Node Group, and IAM roles.

```bash
cd aws/terraform

# Initialize Terraform (download providers)
terraform init

# Apply configuration (type 'yes' when prompted)
terraform apply
# OR auto-approve:
# terraform apply -auto-approve
```

## 2. Destroy Infrastructure (Remove Everything)

**WARNING:** This will delete the entire EKS cluster, all nodes, and the VPC. All data in the cluster will be lost.

### Important: cleanup Load Balancers first
Before destroying Terraform, you must delete any Kubernetes Load Balancers (like Traefik), otherwise Terraform will fail to delete the VPC.

```bash
# Delete all services to release AWS Load Balancers
kubectl delete svc --all -A
```

### Run Terraform Destroy
```bash
cd aws/terraform

# Destroy configuration (type 'yes' when prompted)
terraform destroy
# OR auto-approve:
# terraform destroy -auto-approve
```

### ⚠️ Troubleshooting Stuck Deletion
If `terraform destroy` gets stuck deleting the **Node Group** (e.g., waiting for 15+ mins):
1. Go to **AWS Console > EC2 > Auto Scaling Groups**.
2. Find the ASG for the node group (e.g., `eks-iit-test-...`).
3. Select it -> **Delete** -> **Force Delete**.
4. Terraform should then detect the deletion and finish.
