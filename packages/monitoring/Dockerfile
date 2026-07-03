FROM oven/bun:1
WORKDIR /app
COPY package.json ./

# Install OpenSSH client for EC2 checks
RUN apt-get update && apt-get install -y openssh-client && rm -rf /var/lib/apt/lists/*

RUN bun install

COPY . .

EXPOSE 4000

## Bake the EC2 SSH key into the image at /ec2-keys/
# WARNING: embedding private keys into images is sensitive -ensure registry access is restricted.
COPY .key/ec2-iit-pair /ec2-keys/ec2-iit-pair
RUN chmod 600 /ec2-keys/ec2-iit-pair && chown root:root /ec2-keys/ec2-iit-pair || true

# Default env inside image points to baked key path; docker-compose can still override.
ENV EC2_SSH_KEY=/ec2-keys/ec2-iit-pair

CMD ["bun", "run", "start"]
