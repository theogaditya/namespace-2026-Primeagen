#!/bin/bash
set -e

# Usage: ./cleanup_vpc.sh <vpc_id> <region>
VPC_ID=$1
REGION=$2

if [ -z "$VPC_ID" ] || [ -z "$REGION" ]; then
    echo "Usage: $0 <vpc_id> <region>"
    exit 1
fi

echo "======================================================="
echo " Starting Force Cleanup for VPC: $VPC_ID ($REGION)"
echo "======================================================="

# Function to delete resources with retries
delete_resource() {
    local cmd=$1
    echo "Executing: $cmd"
    eval "$cmd" || echo "Warning: Failed to execute $cmd"
}

# 1. Delete NAT Gateways
echo "--> Checking NAT Gateways..."
NAT_GWS=$(aws ec2 describe-nat-gateways --filter Name=vpc-id,Values=$VPC_ID --region $REGION --query "NatGateways[?State!='deleted'].NatGatewayId" --output text)
for id in $NAT_GWS; do
    echo "Deleting NAT Gateway: $id"
    delete_resource "aws ec2 delete-nat-gateway --nat-gateway-id $id --region $REGION"
    echo "Waiting for NAT Gateway to delete..."
    aws ec2 wait nat-gateway-deleted --nat-gateway-ids $id --region $REGION
done

# 2. Delete Internet Gateways
echo "--> Checking Internet Gateways..."
IGWS=$(aws ec2 describe-internet-gateways --filters Name=attachment.vpc-id,Values=$VPC_ID --region $REGION --query "InternetGateways[].InternetGatewayId" --output text)
for id in $IGWS; do
    echo "Detaching IGW: $id"
    delete_resource "aws ec2 detach-internet-gateway --internet-gateway-id $id --vpc-id $VPC_ID --region $REGION"
    echo "Deleting IGW: $id"
    delete_resource "aws ec2 delete-internet-gateway --internet-gateway-id $id --region $REGION"
done

# 3. Delete VPC Endpoints
echo "--> Checking VPC Endpoints..."
EPS=$(aws ec2 describe-vpc-endpoints --filters Name=vpc-id,Values=$VPC_ID --region $REGION --query "VpcEndpoints[].VpcEndpointId" --output text)
for id in $EPS; do
    echo "Deleting VPC Endpoint: $id"
    delete_resource "aws ec2 delete-vpc-endpoints --vpc-endpoint-ids $id --region $REGION"
done

# 4. Delete VPC Peering Connections
echo "--> Checking VPC Peering Connections..."
PEERS=$(aws ec2 describe-vpc-peering-connections --filters Name=requester-vpc-info.vpc-id,Values=$VPC_ID --region $REGION --query "VpcPeeringConnections[].VpcPeeringConnectionId" --output text)
for id in $PEERS; do
    echo "Deleting VPC Peering Connection: $id"
    delete_resource "aws ec2 delete-vpc-peering-connection --vpc-peering-connection-id $id --region $REGION"
done

# 5. Delete Subnets (and ENIs in them)
echo "--> Checking Subnets..."
SUBNETS=$(aws ec2 describe-subnets --filters Name=vpc-id,Values=$VPC_ID --region $REGION --query "Subnets[].SubnetId" --output text)
for subnet in $SUBNETS; do
    echo "Processing Subnet: $subnet"

    # Check for ENIs in subnet
    ENIS=$(aws ec2 describe-network-interfaces --filters Name=subnet-id,Values=$subnet --region $REGION --query "NetworkInterfaces[].NetworkInterfaceId" --output text)
    for eni in $ENIS; do
        echo "Deleting ENI: $eni"
        delete_resource "aws ec2 delete-network-interface --network-interface-id $eni --region $REGION"
    done

    echo "Deleting Subnet: $subnet"
    delete_resource "aws ec2 delete-subnet --subnet-id $subnet --region $REGION"
done

# 6. Delete Route Tables (non-main)
echo "--> Checking Route Tables..."
RTS=$(aws ec2 describe-route-tables --filters Name=vpc-id,Values=$VPC_ID --region $REGION --query "RouteTables[?Associations[0].Main!= \`true\`].RouteTableId" --output text)
for rt in $RTS; do
    echo "Deleting Route Table: $rt"
    delete_resource "aws ec2 delete-route-table --route-table-id $rt --region $REGION"
done

# 7. Delete Security Groups (non-default)
# Note: This might fail if there are circular dependencies, but we try anyway.
echo "--> Checking Security Groups..."
SGS=$(aws ec2 describe-security-groups --filters Name=vpc-id,Values=$VPC_ID --region $REGION --query "SecurityGroups[?GroupName!='default'].GroupId" --output text)
for sg in $SGS; do
    echo "Deleting Security Group: $sg"
    delete_resource "aws ec2 delete-security-group --group-id $sg --region $REGION"
done

echo "======================================================="
echo " Cleanup Complete."
echo "======================================================="
