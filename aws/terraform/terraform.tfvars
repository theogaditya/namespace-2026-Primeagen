# ============================================
# IIT-Test AWS EKS — User Configuration
# ============================================
# Override any variable defaults here.
# To use: terraform apply -var-file="terraform.tfvars"
# ============================================

aws_region     = "ap-south-1"
project_name   = "iit-test"
cluster_name   = "iit-test-eks"
cluster_version = "1.31"

# Node group sizing — adjust to taste
node_instance_types = ["t3.small"]
desired_nodes       = 2
min_nodes           = 1
max_nodes           = 4

# VPC CIDR
vpc_cidr        = "10.0.0.0/16"
public_subnets  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnets = ["10.0.10.0/24", "10.0.20.0/24"]
