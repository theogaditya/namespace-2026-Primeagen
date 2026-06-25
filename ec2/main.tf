terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-south-1"
}

data "aws_vpc" "default" {
  default = true
}

# ── Look up existing security group by name ──────────────────
data "aws_security_groups" "existing_web_sg" {
  filter {
    name   = "group-name"
    values = ["swaraj-web-sg"]
  }

  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Only create the SG if it does NOT already exist
resource "aws_security_group" "web_sg" {
  count       = length(data.aws_security_groups.existing_web_sg.ids) == 0 ? 1 : 0
  name        = "swaraj-web-sg"
  description = "Allow SSH and HTTP inbound traffic"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH from anywhere"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Backend services (admin-be, user-be, user-ws, comp-queue)"
    from_port   = 3000
    to_port     = 3005
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Self service"
    from_port   = 3030
    to_port     = 3030
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "swaraj-web-sg"
  }
}

# Resolve the SG ID: use existing if found, otherwise the newly created one
locals {
  web_sg_id = (
    length(data.aws_security_groups.existing_web_sg.ids) > 0
    ? data.aws_security_groups.existing_web_sg.ids[0]
    : aws_security_group.web_sg[0].id
  )
}

data "aws_ami" "ubuntu" {
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  owners = ["099720109477"] # Canonical
}

# Key Pair — create it; Terraform state tracks it across runs.
# If it already exists outside state, run:
#   terraform import aws_key_pair.deployer ec2-iit-pair
resource "aws_key_pair" "deployer" {
  key_name   = "ec2-iit-pair"
  public_key = file("${path.module}/.key/ec2-iit-pair.pub")
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "m7i-flex.large"

  key_name               = "ec2-iit-pair"
  vpc_security_group_ids = [local.web_sg_id]

  tags = {
    Name = "Swaraj-EC2-Instance"
  }

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }
}

output "instance_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_instance.web.public_ip
}

output "private_key_path" {
  description = "Path to the private key for SSH access"
  value       = "${path.module}/.key/ec2-iit-pair"
}
