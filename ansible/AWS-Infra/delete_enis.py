import boto3
import sys

subnet_ids = ['subnet-0f0b15a7d6e746c19', 'subnet-041e0a37cee3dd6ad']

try:
    ec2 = boto3.client('ec2')
    print("Connecting to EC2...")

    # Find ENIs in these subnets
    response = ec2.describe_network_interfaces(
        Filters=[
            {'Name': 'subnet-id', 'Values': subnet_ids}
        ]
    )

    enis = response['NetworkInterfaces']
    if not enis:
        print("No network interfaces found in the specified subnets.")
        sys.exit(0)

    print(f"Found {len(enis)} network interfaces.")

    for eni in enis:
        eni_id = eni['NetworkInterfaceId']
        print(f"Deleting ENI: {eni_id} ({eni.get('Description', 'No description')})")
        try:
            # Detach if attached
            if 'Attachment' in eni:
                attach_id = eni['Attachment']['AttachmentId']
                print(f"  Detaching {eni_id} first...")
                ec2.detach_network_interface(AttachmentId=attach_id, Force=True)
                # Wait for detachment? Usually takes a moment.

            ec2.delete_network_interface(NetworkInterfaceId=eni_id)
            print(f"  Successfully deleted {eni_id}")
        except Exception as e:
            print(f"  Error deleting {eni_id}: {str(e)}")

except Exception as main_e:
    print(f"Script failed: {str(main_e)}")
