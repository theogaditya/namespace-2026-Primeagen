# what i think
the redis is cause all the errors ... if there is some code error ... it should be been shown in the local run of docker compose ... but it is not ... so i think the problem is some thing else ...what i dont know ...dont solve it or change any code ...tell me whats the error 


cd packages/user-be && sudo docker build --no-cache -t ogadityahota/swarajdesk-user-be:latest . && sudo docker push ogadityahota/swarajdesk-user-be:latest
cd ../admin-be && sudo docker build --no-cache -t ogadityahota/sih-swarajdesk-admin-be:latest . && sudo docker push ogadityahota/sih-swarajdesk-admin-be:latest
cd ../agents && sudo docker build --no-cache -t ogadityahota/swarajdesk-agents:latest . && sudo docker push ogadityahota/swarajdesk-agents:latest
cd ../compQueue && sudo docker build --no-cache -t ogadityahota/swarajdesk-comp-queue:latest . && sudo docker push ogadityahota/swarajdesk-comp-queue:latest
cd ../blockchain-be && sudo docker build --no-cache -t ogadityahota/swarajdesk-blockchain-be:latest . && sudo docker push ogadityahota/swarajdesk-blockchain-be:latest



###########################################################################################################################################################################################################################################################################################################################################################################################################################################
###########################################################################################################################################################################################################################################################################################################################################################################################################################################

stack.yaml 

services:
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass strongpassword --appendonly yes
    volumes:
      - redis-data:/data
    networks:
      swarajdesk:
        aliases:
          - redis
          - swarajdesk_redis
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 10
        window: 30s
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "strongpassword", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  user-be:
    image: ogadityahota/swarajdesk-user-be:${IMAGE_TAG:-latest}
    env_file: /opt/swarajdesk/envs/user-be.env
    environment:
      REDIS_URL: redis://default:strongpassword@redis:6379
      REDIS_HOST: redis
      REDIS_PORT: "6379"
      REDIS_PASSWORD: strongpassword
    networks:
      - swarajdesk
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 5
        window: 60s
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
        order: start-first
      rollback_config:
        parallelism: 1
        order: stop-first
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.user-be.rule=Host(`gsc-user-be.abhasbehera.in`)"
        - "traefik.http.routers.user-be.entrypoints=websecure"
        - "traefik.http.routers.user-be.tls.certresolver=letsencrypt"
        - "traefik.http.services.user-be.loadbalancer.server.port=3000"
        - "traefik.http.routers.ws-user-be.rule=Host(`gsc-ws-user-be.abhasbehera.in`)"
        - "traefik.http.routers.ws-user-be.entrypoints=websecure"
        - "traefik.http.routers.ws-user-be.tls.certresolver=letsencrypt"
        - "traefik.http.services.ws-user-be.loadbalancer.server.port=3001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s

  admin-be:
    image: ogadityahota/sih-swarajdesk-admin-be:${IMAGE_TAG:-latest}
    env_file: /opt/swarajdesk/envs/admin-be.env
    environment:
      REDIS_URL: redis://default:strongpassword@redis:6379
      REDIS_HOST: redis
      REDIS_PORT: "6379"
      REDIS_PASSWORD: strongpassword
    networks:
      - swarajdesk
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 5
        window: 60s
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
        order: start-first
      rollback_config:
        parallelism: 1
        order: stop-first
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.admin-be.rule=Host(`gsc-admin-be.abhasbehera.in`)"
        - "traefik.http.routers.admin-be.entrypoints=websecure"
        - "traefik.http.routers.admin-be.tls.certresolver=letsencrypt"
        - "traefik.http.services.admin-be.loadbalancer.server.port=3002"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s

  compqueue:
    image: ogadityahota/swarajdesk-comp-queue:${IMAGE_TAG:-latest}
    env_file: /opt/swarajdesk/envs/compqueue.env
    environment:
      REDIS_URL: redis://default:strongpassword@redis:6379
      REDIS_HOST: redis
      REDIS_PORT: "6379"
      REDIS_PASSWORD: strongpassword
    networks:
      - swarajdesk
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 5
        window: 60s
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
        order: start-first
      rollback_config:
        parallelism: 1
        order: stop-first
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.compqueue.rule=Host(`gsc-compqueue.abhasbehera.in`)"
        - "traefik.http.routers.compqueue.entrypoints=websecure"
        - "traefik.http.routers.compqueue.tls.certresolver=letsencrypt"
        - "traefik.http.services.compqueue.loadbalancer.server.port=3005"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3005/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s

  agents:
    image: ogadityahota/swarajdesk-agents:${IMAGE_TAG:-latest}
    env_file: /opt/swarajdesk/envs/agents.env
    environment:
      REDIS_URL: redis://default:strongpassword@redis:6379
      REDIS_HOST: redis
      REDIS_PORT: "6379"
      REDIS_PASSWORD: strongpassword
    networks:
      - swarajdesk
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 5
        window: 60s
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
        order: start-first
      rollback_config:
        parallelism: 1
        order: stop-first
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.agents.rule=Host(`gsc-agents-be.abhasbehera.in`)"
        - "traefik.http.routers.agents.entrypoints=websecure"
        - "traefik.http.routers.agents.tls.certresolver=letsencrypt"
        - "traefik.http.services.agents.loadbalancer.server.port=3040"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3040/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s

  blockchain-be:
    image: ogadityahota/swarajdesk-blockchain-be:${IMAGE_TAG:-latest}
    env_file: /opt/swarajdesk/envs/blockchain-be.env
    environment:
      REDIS_URL: redis://default:strongpassword@redis:6379
      REDIS_HOST: redis
      REDIS_PORT: "6379"
      REDIS_PASSWORD: strongpassword
    networks:
      - swarajdesk
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 5
        window: 60s
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
        order: start-first
      rollback_config:
        parallelism: 1
        order: stop-first
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.blockchain-be.rule=Host(`gsc-blockchain-be.abhasbehera.in`)"
        - "traefik.http.routers.blockchain-be.entrypoints=websecure"
        - "traefik.http.routers.blockchain-be.tls.certresolver=letsencrypt"
        - "traefik.http.services.blockchain-be.loadbalancer.server.port=4100"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4100/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s

  report-ai:
    image: mistaholmes/report-ai-model-survey:${IMAGE_TAG:-latest}
    env_file: /opt/swarajdesk/envs/report-ai.env
    environment:
      REDIS_URL: redis://default:strongpassword@redis:6379
      REDIS_HOST: redis
      REDIS_PORT: "6379"
      REDIS_PASSWORD: strongpassword
    volumes:
      - report-ai-data:/app/data
    networks:
      - swarajdesk
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 5
        window: 60s
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
        order: start-first
      rollback_config:
        parallelism: 1
        order: stop-first
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s

networks:
  swarajdesk:
    external: true
    name: swarajdesk

volumes:
  redis-data:
  report-ai-data:



provision-vm.yaml

---
# SwarajDesk — One-time VM Provisioning Playbook
# Usage: ansible-playbook -i inventory.ini provision-vm.yaml

- name: Provision SwarajDesk VM
  hosts: swarajdesk_servers
  become: true
  vars:
    deploy_dir: /opt/swarajdesk
    deploy_user: "{{ ansible_user | default(ansible_user_id) }}"
    dockerhub_user: ogadityahota
    dockerhub_pat: dckr_pat_25pFlt56VSagoCwPlOM-qDDyhIg
    env_files:
      - user-be.env
      - admin-be.env
      - compqueue.env
      - agents.env
      - blockchain-be.env
      - report-ai.env

  tasks:
    # ─── 1. Install Docker ───
    - name: Install Docker prerequisites
      apt:
        name: [apt-transport-https, ca-certificates, curl, gnupg, lsb-release, rsync]
        state: present
        update_cache: true

    - name: Add Docker GPG key
      shell: |
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
      args:
        creates: /usr/share/keyrings/docker-archive-keyring.gpg

    - name: Add Docker repository
      apt_repository:
        repo: "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu {{ ansible_lsb.codename }} stable"
        state: present

    - name: Install Docker Engine + Compose plugin
      apt:
        name: [docker-ce, docker-ce-cli, containerd.io, docker-compose-plugin]
        state: present

    - name: Enable Docker service
      systemd:
        name: docker
        enabled: true
        state: started

    - name: Add SSH user to docker group
      user:
        name: "{{ deploy_user }}"
        groups: docker
        append: true

    # ─── 2. Docker Hub Login ───
    - name: Login to Docker Hub
      shell: echo "{{ dockerhub_pat }}" | docker login -u "{{ dockerhub_user }}" --password-stdin

    # ─── 3. Initialize Swarm ───
    - name: Initialize Docker Swarm
      shell: |
        if [ "$(docker info --format '{{ "{{" }}.Swarm.LocalNodeState{{ "}}" }}')" = "active" ]; then
          echo "already-active"
        else
          docker swarm init
        fi
      register: swarm_init
      changed_when: "'already-active' not in swarm_init.stdout"

    # ─── 4. Create overlay network ───
    - name: Create overlay network
      shell: |
        if docker network inspect swarajdesk >/dev/null 2>&1; then
          echo "already-exists"
        else
          docker network create --driver overlay --attachable swarajdesk
        fi
      register: overlay_network
      changed_when: "'already-exists' not in overlay_network.stdout"

    # ─── 5. Create Docker secrets ───
    - name: Create Docker secrets
      shell: |
        echo -n "{{ item.value }}" | docker secret create {{ item.name }} - 2>/dev/null || echo "already-exists"
      register: secret_result
      changed_when: "'already-exists' not in secret_result.stdout"
      loop:
        - { name: database_url, value: "postgresql://myuser:mypassword@db.abhasbehera.in:5432/mydb" }
        - { name: jwt_secret, value: "Big2026" }
        - { name: redis_url, value: "redis://default:strongpassword@redis:6379" }
        - { name: s3_access_key, value: "AKIAZ53VJYCLAN563LY2" }
        - { name: s3_secret_key, value: "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" }
        - { name: secrets_aws_access_key, value: "AKIAZ53VJYCLAGVGCIWC" }
        - { name: secrets_aws_secret_key, value: "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" }
        - { name: openai_api_key, value: "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" }
        - { name: internal_api_key, value: "swaraj-internal-agents-key-2025" }
        - { name: blockchain_private_key, value: "0xd2d72c34dfd4247d83a2df480027f46a93bbe482645fb23df06b64b0ea56076a" }
        - { name: blockchain_rpc_url, value: "https://eth-sepolia.g.alchemy.com/v2/bQ0qQf1ccLRLnSETVYcsY" }
        - { name: pinata_jwt, value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJjMWQ3MTA4OC01YjdkLTQ1YTYtOWEzMy0xMDc4MWRmODI4MTciLCJlbWFpbCI6ImZuYXRpY3JpdGVzaDIwMDRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6ImM2MGI2MzI3NTFiYTI4NDRjMmZjIiwic2NvcGVkS2V5U2VjcmV0IjoiMjM1ZTY3ZWQ4N2RkN2M2NjU5MzY0NTczMTRkYTg2YWMxNWE2MWZlOWRmN2M4NzIyZDQ3YzhjMjMxMzg1MmY3NCIsImV4cCI6MTgwMjU5Nzg4OX0.9pyjW7iMHFddbGmRdtsfplo452seKnWNzXP9IP0w3dI" }
        - { name: pinata_api_key, value: "c60b632751ba2844c2fc" }
        - { name: pinata_api_secret, value: "235e67ed87dd7c665936457314da86ac15a61fe9df7c8722d47c8c2313852f74" }
        - { name: gcp_credentials_json, value: "{\"type\": \"service_account\", \"project_id\": \"orbital-builder-454706-h5\", \"private_key_id\": \"152c9a81d913a3c20c6d2f8d09df887c1c77ebfd\", \"private_key\": \"-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7QECFLqwLw0D2\\nSY9eYH6y9jY0pGKxUXD5y+gP3BvOWCvKo3CVbP3lKzKDf4/DGEBg7Yy4cQYW8NTG\\ncpfKnMhkDwZauztSJboxKwrDpapHX7jnuJVfGYaU3sQkkS/F8qX29OMV6cKVbiZz\\nUglKOybYg4Bikk8kcLBlsfsF/aSuqnkhcpIAza71mhXD8pPzwPN7GOa0YkSkNSSM\\nsIRfnApy3xjHNxwp8WebWcJa8VlXZVQGdCfxn3AIBjvD8CsBRF1V2fX27D5BD/wS\\nQAN1uEVVpxeJ7/+GrEm9GkZvqcZIidGOyAxdkPyrJ4qmv4B+mwm0XyKh0Tl8xOSm\\nB9niD32PAgMBAAECggEAATWr3SOX5pAxS2N0vsfbBCILZjAB1WXJ8YtG8Y+NUm8C\\nxUByWhq98kU6CTufbAm4KZp71+geo5CNygA3pYJNDwaa8TlE+wJGZeBiEQg95E/1\\ntp+WXHT0dts0RmCSvvsdJr7aRp87E92SDDt4LD2yhIF/9VEjt1HQwKF1P0xhXTYn\\ng5vNNi4CgasOL6j8pK/gmHV+18vq1kPVyX7D6WEdoC84IonmSBlpno/O3ezXBEqO\\nXV8HrWI1Bt3LyjthwhW8P+Xg8pGs/FpJGyB/ljvHs5zGbnC3y4Tx+yTjXXM2GXNC\\nHCvXfA294NgxQlSESBKgO5wmMDKWsmk6uiO7KuWJaQKBgQDhGJCtzzliLtNo7Fb6\\nBWZgJLGcz+qBLS/jAeLrKDA7CNMHJnt1GhCiiYSyZM9P/0UFArlHkW4/0erJRHDY\\nFAiMAXhuv0fKuHlQccA8mHevysxomOqJyamUEfrHzoWne8kMENn6Gsr/NMIf6X8z\\nIVKsGn7Cp1fRBeYenyROYEM67QKBgQDU9Y0/+jHnmMF1UgI+VvocAbP8zVx+MFXv\\nfqZfIy0r8smg3umL8P/HKDyauHcB2QJhS5eCqQP+Qv4yFotNZVxdPM9fbPGgSTNT\\nDDdI9RBc5MY2B+yr4LrrV1Sr7653bEYSfAhBhTbnBovgKgJYT6pEFBxZ1b2U4RxH\\nAlSqcv8+6wKBgQDgAPVBsr4VYioK+V9Y8nS96uZB+nsRUCmejCsI//Z3WUHAlOA5\\nWdYCGj5O1Zmlr5A8+0fs2+JOapVu88gkkFMtGO2DsKE+MTSxBHJdGxHIhFXFJaAJ\\nvQEgFIBvxKsnUD1z33U8utsW+6bP4Ssvc9L06G0LQ0NWBLvL721O/ecJxQKBgEXt\\nm8Q2U8zIzD3KABKYXOh1ZrTMemK1XIKYA+mZk2uq/apliCr7qAGtpLjpeaqRp8Zr\\nHAU7mqQTO4UXAgcYEYxMO4wKKg2H++J5UG4Uipr2RF/Zmk2WLcq5koQi4Bc25ouL\\nTuq046JY8/VX1g1Jm49fSy/0j5wjjzWB/ms597ahAoGAOwGHCsR/XYY/A/N4ETuw\\nNXthMkZoLkKfAviyQ0kV87B4LUKSRP1nphPVMGMFZD10hn1ioN+0uUdYSd26lttU\\nwt72Kd14A25gQnWMWb2pHCIsa7kyTZc/mLPlHlHfroDgDIT268xyEVqhsvx4XIe0\\nIGw0cl3x2VbLL3mxFLg1Ugo=\\n-----END PRIVATE KEY-----\\n\", \"client_email\": \"jun-24-vertex-ai@orbital-builder-454706-h5.iam.gserviceaccount.com\", \"client_id\": \"116850999540116201728\", \"auth_uri\": \"https://accounts.google.com/o/oauth2/auth\", \"token_uri\": \"https://oauth2.googleapis.com/token\", \"auth_provider_x509_cert_url\": \"https://www.googleapis.com/oauth2/v1/certs\", \"client_x509_cert_url\": \"https://www.googleapis.com/robot/v1/metadata/x509/jun-24-vertex-ai%40orbital-builder-454706-h5.iam.gserviceaccount.com\", \"universe_domain\": \"googleapis.com\" }" }
        - { name: recaptcha_secret, value: "6Lcje6MsAAAAAHShcyOEU-wlncIdg3n0ZjWj70fI" }

    # ─── 6. Copy stack files to VM ───
    - name: Create deployment directory
      file:
        path: "{{ deploy_dir }}"
        state: directory
        owner: "{{ deploy_user }}"
        group: "{{ deploy_user }}"

    - name: Create env directory
      file:
        path: "{{ deploy_dir }}/envs"
        state: directory
        owner: "{{ deploy_user }}"
        group: "{{ deploy_user }}"
        mode: "0755"

    - name: Copy deployment files
      synchronize:
        src: "{{ playbook_dir }}/../"
        dest: "{{ deploy_dir }}/"
        delete: false
        rsync_opts:
          - "--exclude=ansible"
          - "--exclude=envs"
          - "--exclude=implimentetion.md"

    - name: Copy hardcoded env files to VM
      copy:
        src: "{{ playbook_dir }}/../envs/{{ item }}"
        dest: "{{ deploy_dir }}/envs/{{ item }}"
        owner: "{{ deploy_user }}"
        group: "{{ deploy_user }}"
        mode: "0600"
      loop: "{{ env_files }}"

    # ─── 7. Deploy Traefik ───
    - name: Deploy Traefik
      shell: docker stack deploy -c {{ deploy_dir }}/swarm/traefik.yaml traefik

    # ─── 8. Deploy Monitoring ───
    - name: Deploy Monitoring Stack
      shell: docker stack deploy -c {{ deploy_dir }}/monitoring/docker-compose.monitoring.yaml monitoring

    # ─── 9. Deploy Application Stack ───
    - name: Deploy SwarajDesk
      shell: docker stack deploy -c {{ deploy_dir }}/swarm/stack.yaml swarajdesk

    # ─── 10. Wait and verify ───
    - name: Wait for services to start
      pause:
        seconds: 30

    - name: Show service status
      shell: docker service ls
      register: service_status

    - name: Print service status
      debug:
        var: service_status.stdout_lines

    - name: Wait until stacks are healthy
      shell: |
        APP_FAILED=$(docker stack services swarajdesk --format "{{ '{{' }}.Replicas{{ '}}' }}" | grep -vc "^1/1$")
        MON_FAILED=$(docker stack services monitoring --format "{{ '{{' }}.Replicas{{ '}}' }}" | grep -vc "^1/1$")
        if [ "$APP_FAILED" -gt "0" ] || [ "$MON_FAILED" -gt "0" ]; then
          echo "Application stack:"
          docker stack services swarajdesk
          echo "Monitoring stack:"
          docker stack services monitoring
          exit 1
        fi
        echo "All stacks healthy"
      register: stack_health
      retries: 8
      delay: 15
      until: stack_health.rc == 0



error : 
 ✔ Container deployment-compqueue-1     Started
sih-swarajdesk-2025/packages/deployment on  main [$!?]
❯ sudo docker compose down
[+] down 8/8
 ✔ Container deployment-report-ai-1     Removed
 ✔ Container deployment-user-be-1       Removed
 ✔ Container deployment-agents-1        Removed
 ✔ Container deployment-admin-be-1      Removed
 ✔ Container deployment-compqueue-1     Removed
 ✔ Container deployment-blockchain-be-1 Removed
 ✔ Container swarajdesk-redis           Removed
 ✔ Network deployment_swarajdesk        Removed
sih-swarajdesk-2025/packages/deployment on  main [$!?]
❯ d
sih-swarajdesk-2025/packages on  main [$!?]
❯ cd deployment/ansible/
packages/deployment/ansible on  main [$!?]
❯ ansible-playbook -i inventory.ini provision-vm.yaml

PLAY [Provision SwarajDesk VM] ********************************************************************************************************************************************************************************

TASK [Gathering Facts] ****************************************************************************************************************************************************************************************
ok: [swarajdesk-vm]

TASK [Install Docker prerequisites] ***************************************************************************************************************************************************************************
ok: [swarajdesk-vm]

TASK [Add Docker GPG key] *************************************************************************************************************************************************************************************
ok: [swarajdesk-vm]

TASK [Add Docker repository] **********************************************************************************************************************************************************************************
ok: [swarajdesk-vm]

TASK [Install Docker Engine + Compose plugin] *****************************************************************************************************************************************************************
ok: [swarajdesk-vm]

TASK [Enable Docker service] **********************************************************************************************************************************************************************************
ok: [swarajdesk-vm]

TASK [Add SSH user to docker group] ***************************************************************************************************************************************************************************
ok: [swarajdesk-vm]

TASK [Login to Docker Hub] ************************************************************************************************************************************************************************************
changed: [swarajdesk-vm]

TASK [Initialize Docker Swarm] ********************************************************************************************************************************************************************************
changed: [swarajdesk-vm]

TASK [Create overlay network] *********************************************************************************************************************************************************************************
changed: [swarajdesk-vm]

TASK [Create Docker secrets] **********************************************************************************************************************************************************************************
changed: [swarajdesk-vm] => (item={'name': 'database_url', 'value': 'postgresql://myuser:mypassword@db.abhasbehera.in:5432/mydb'})
changed: [swarajdesk-vm] => (item={'name': 'jwt_secret', 'value': 'Big2026'})
changed: [swarajdesk-vm] => (item={'name': 'redis_url', 'value': 'redis://default:strongpassword@redis:6379'})
changed: [swarajdesk-vm] => (item={'name': 's3_access_key', 'value': 'AKIAZ53VJYCLAN563LY2'})
changed: [swarajdesk-vm] => (item={'name': 's3_secret_key', 'value': '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'})
changed: [swarajdesk-vm] => (item={'name': 'secrets_aws_access_key', 'value': 'AKIAZ53VJYCLAGVGCIWC'})
changed: [swarajdesk-vm] => (item={'name': 'secrets_aws_secret_key', 'value': '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'})
changed: [swarajdesk-vm] => (item={'name': 'openai_api_key', 'value': 'sk-proj-HFIBYqfZoryJPzlpfByQ9LQDWjikKwRg5ZGzgSi6s3szf4VZN2ana_5bKwRRDjitniYeGx8kkOT3BlbkFJkqJ1Gu-ELvR5YOanOEhvB96SA7wIBvnqvcp1N-sYFIeC0a
changed: [swarajdesk-vm] => (item={'name': 'internal_api_key', 'value': 'swaraj-internal-agents-key-2025'})
changed: [swarajdesk-vm] => (item={'name': 'blockchain_private_key', 'value': '0xd2d72c34dfd4247d83a2df480027f46a93bbe482645fb23df06b64b0ea56076a'})
changed: [swarajdesk-vm] => (item={'name': 'blockchain_rpc_url', 'value': 'https://eth-sepolia.g.alchemy.com/v2/bQ0qQf1ccLRLnSETVYcsY'})
changed: [swarajdesk-vm] => (item={'name': 'pinata_jwt', 'value': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJjMWQ3MTA4OC01YjdkLTQ1YTYtOWEzMy0xMDc4MWRmODI4MTciLCJlbWFpbCI6ImZuYXR
changed: [swarajdesk-vm] => (item={'name': 'pinata_api_key', 'value': 'c60b632751ba2844c2fc'})
changed: [swarajdesk-vm] => (item={'name': 'pinata_api_secret', 'value': '235e67ed87dd7c665936457314da86ac15a61fe9df7c8722d47c8c2313852f74'})
changed: [swarajdesk-vm] => (item={'name': 'gcp_credentials_json', 'value': '{"type": "service_account", "project_id": "orbital-builder-454706-h5", "private_key_id": "152c9a81d913a3c20c6d2f8d09df887c1c77ebfd
changed: [swarajdesk-vm] => (item={'name': 'recaptcha_secret', 'value': '6Lcje6MsAAAAAHShcyOEU-wlncIdg3n0ZjWj70fI'})

TASK [Create deployment directory] ****************************************************************************************************************************************************************************
ok: [swarajdesk-vm]

TASK [Create env directory] ***********************************************************************************************************************************************************************************
changed: [swarajdesk-vm]

TASK [Copy deployment files] **********************************************************************************************************************************************************************************
[DEPRECATION WARNING]: The connection's stdin object is deprecated. Call display.prompt_until(msg) instead. This feature will be removed in version 2.19. Deprecation warnings can be disabled by setting
deprecation_warnings=False in ansible.cfg.
changed: [swarajdesk-vm]

TASK [Copy hardcoded env files to VM] *************************************************************************************************************************************************************************
changed: [swarajdesk-vm] => (item=user-be.env)
changed: [swarajdesk-vm] => (item=admin-be.env)
changed: [swarajdesk-vm] => (item=compqueue.env)
changed: [swarajdesk-vm] => (item=agents.env)
changed: [swarajdesk-vm] => (item=blockchain-be.env)
changed: [swarajdesk-vm] => (item=report-ai.env)

TASK [Deploy Traefik] *****************************************************************************************************************************************************************************************
changed: [swarajdesk-vm]

TASK [Deploy Monitoring Stack] ********************************************************************************************************************************************************************************
changed: [swarajdesk-vm]

TASK [Deploy SwarajDesk] **************************************************************************************************************************************************************************************
changed: [swarajdesk-vm]

TASK [Wait for services to start] *****************************************************************************************************************************************************************************
Pausing for 30 seconds
(ctrl+C then 'C' = continue early, ctrl+C then 'A' = abort)
ok: [swarajdesk-vm]

TASK [Show service status] ************************************************************************************************************************************************************************************
changed: [swarajdesk-vm]

TASK [Print service status] ***********************************************************************************************************************************************************************************
ok: [swarajdesk-vm] => {
    "service_status.stdout_lines": [
        "ID             NAME                       MODE         REPLICAS   IMAGE                                          PORTS",
        "wrw9aycvmuw8   monitoring_cadvisor        global       1/1        gcr.io/cadvisor/cadvisor:latest                ",
        "qk9lqnsife9u   monitoring_grafana         replicated   0/1        grafana/grafana:latest                         ",
        "f9nbdl4skgg3   monitoring_loki            replicated   0/1        grafana/loki:latest                            ",
        "44tg4201ktex   monitoring_node-exporter   global       1/1        prom/node-exporter:latest                      ",
        "ud6qk9gta8h4   monitoring_prometheus      replicated   0/1        prom/prometheus:latest                         ",
        "en321b5pf09b   monitoring_promtail        global       1/1        grafana/promtail:latest                        ",
        "sxzu8beiqg83   monitoring_uptime-kuma     replicated   0/1        louislam/uptime-kuma:latest                    ",
        "ztpca4x070m2   swarajdesk_admin-be        replicated   0/1        ogadityahota/sih-swarajdesk-admin-be:latest    ",
        "x8dzqjgy3a7q   swarajdesk_agents          replicated   0/1        ogadityahota/swarajdesk-agents:latest          ",
        "haaj3l3poda9   swarajdesk_blockchain-be   replicated   0/1        ogadityahota/swarajdesk-blockchain-be:latest   ",
        "wucci2zl5aaf   swarajdesk_compqueue       replicated   0/1        ogadityahota/swarajdesk-comp-queue:latest      ",
        "plfpksoob7bx   swarajdesk_redis           replicated   0/1        redis:7-alpine                                 ",
        "gamrbi3jjhqj   swarajdesk_report-ai       replicated   0/1        mistaholmes/report-ai-model-survey:latest      ",
        "icu0trkyxrst   swarajdesk_user-be         replicated   0/1        ogadityahota/swarajdesk-user-be:latest         ",
        "dzjj3zhh33j4   traefik_traefik            replicated   1/1        traefik:v3.0                                   "
    ]
}

TASK [Wait until stacks are healthy] **************************************************************************************************************************************************************************
FAILED - RETRYING: [swarajdesk-vm]: Wait until stacks are healthy (8 retries left).
FAILED - RETRYING: [swarajdesk-vm]: Wait until stacks are healthy (7 retries left).
FAILED - RETRYING: [swarajdesk-vm]: Wait until stacks are healthy (6 retries left).
FAILED - RETRYING: [swarajdesk-vm]: Wait until stacks are healthy (5 retries left).
FAILED - RETRYING: [swarajdesk-vm]: Wait until stacks are healthy (4 retries left).
FAILED - RETRYING: [swarajdesk-vm]: Wait until stacks are healthy (3 retries left).
FAILED - RETRYING: [swarajdesk-vm]: Wait until stacks are healthy (2 retries left).
FAILED - RETRYING: [swarajdesk-vm]: Wait until stacks are healthy (1 retries left).
fatal: [swarajdesk-vm]: FAILED! => {"attempts": 8, "changed": true, "cmd": "APP_FAILED=$(docker stack services swarajdesk --format \"{{.Replicas}}\" | grep -vc \"^1/1$\")\nMON_FAILED=$(docker stack services monitoring --format \"{{.Replicas}}\" | grep -vc \"^1/1$\")\nif [ \"$APP_FAILED\" -gt \"0\" ] || [ \"$MON_FAILED\" -gt \"0\" ]; then\n  echo \"Application stack:\"\n  docker stack services swarajdesk\n  echo \"Monitoring stack:\"\n  docker stack services monitoring\n  exit 1\nfi\necho \"All stacks healthy\"\n", "delta": "0:00:00.209504", "end": "2026-04-19 11:36:31.773806", "msg": "non-zero return code", "rc": 1, "start": "2026-04-19 11:36:31.564302", "stderr": "", "stderr_lines": [], "stdout": "Application stack:\nID             NAME                       MODE         REPLICAS   IMAGE                                          PORTS\nztpca4x070m2   swarajdesk_admin-be        replicated   1/1        ogadityahota/sih-swarajdesk-admin-be:latest    \nx8dzqjgy3a7q   swarajdesk_agents          replicated   1/1        ogadityahota/swarajdesk-agents:latest          \nhaaj3l3poda9   swarajdesk_blockchain-be   replicated   1/1        ogadityahota/swarajdesk-blockchain-be:latest   \nwucci2zl5aaf   swarajdesk_compqueue       replicated   1/1        ogadityahota/swarajdesk-comp-queue:latest      \nplfpksoob7bx   swarajdesk_redis           replicated   1/1        redis:7-alpine                                 \ngamrbi3jjhqj   swarajdesk_report-ai       replicated   0/1        mistaholmes/report-ai-model-survey:latest      \nicu0trkyxrst   swarajdesk_user-be         replicated   1/1        ogadityahota/swarajdesk-user-be:latest         \nMonitoring stack:\nID             NAME                       MODE         REPLICAS   IMAGE                             PORTS\nwrw9aycvmuw8   monitoring_cadvisor        global       1/1        gcr.io/cadvisor/cadvisor:latest   \nqk9lqnsife9u   monitoring_grafana         replicated   1/1        grafana/grafana:latest            \nf9nbdl4skgg3   monitoring_loki            replicated   1/1        grafana/loki:latest               \n44tg4201ktex   monitoring_node-exporter   global       1/1        prom/node-exporter:latest         \nud6qk9gta8h4   monitoring_prometheus      replicated   1/1        prom/prometheus:latest            \nen321b5pf09b   monitoring_promtail        global       1/1        grafana/promtail:latest           \nsxzu8beiqg83   monitoring_uptime-kuma     replicated   1/1        louislam/uptime-kuma:latest       ", "stdout_lines": ["Application stack:", "ID             NAME                       MODE         REPLICAS   IMAGE                                          PORTS", "ztpca4x070m2   swarajdesk_admin-be        replicated   1/1        ogadityahota/sih-swarajdesk-admin-be:latest    ", "x8dzqjgy3a7q   swarajdesk_agents          replicated   1/1        ogadityahota/swarajdesk-agents:latest          ", "haaj3l3poda9   swarajdesk_blockchain-be   replicated   1/1        ogadityahota/swarajdesk-blockchain-be:latest   ", "wucci2zl5aaf   swarajdesk_compqueue       replicated   1/1        ogadityahota/swarajdesk-comp-queue:latest      ", "plfpksoob7bx   swarajdesk_redis           replicated   1/1        redis:7-alpine                                 ", "gamrbi3jjhqj   swarajdesk_report-ai       replicated   0/1        mistaholmes/report-ai-model-survey:latest      ", "icu0trkyxrst   swarajdesk_user-be         replicated   1/1        ogadityahota/swarajdesk-user-be:latest         ", "Monitoring stack:", "ID             NAME                       MODE         REPLICAS   IMAGE                             PORTS", "wrw9aycvmuw8   monitoring_cadvisor        global       1/1        gcr.io/cadvisor/cadvisor:latest   ", "qk9lqnsife9u   monitoring_grafana         replicated   1/1        grafana/grafana:latest            ", "f9nbdl4skgg3   monitoring_loki            replicated   1/1        grafana/loki:latest               ", "44tg4201ktex   monitoring_node-exporter   global       1/1        prom/node-exporter:latest         ", "ud6qk9gta8h4   monitoring_prometheus      replicated   1/1        prom/prometheus:latest            ", "en321b5pf09b   monitoring_promtail        global       1/1        grafana/promtail:latest           ", "sxzu8beiqg83   monitoring_uptime-kuma     replicated   1/1        louislam/uptime-kuma:latest       "]}

PLAY RECAP ****************************************************************************************************************************************************************************************************
swarajdesk-vm              : ok=21   changed=11   unreachable=0    failed=1    skipped=0    rescued=0    ignored=0

packages/deployment/ansible on  main [$!?]
❯


---
ID             NAME                       MODE         REPLICAS   IMAGE                                          PORTS
wrw9aycvmuw8   monitoring_cadvisor        global       1/1        gcr.io/cadvisor/cadvisor:latest
qk9lqnsife9u   monitoring_grafana         replicated   1/1        grafana/grafana:latest
f9nbdl4skgg3   monitoring_loki            replicated   1/1        grafana/loki:latest
44tg4201ktex   monitoring_node-exporter   global       1/1        prom/node-exporter:latest
ud6qk9gta8h4   monitoring_prometheus      replicated   1/1        prom/prometheus:latest
en321b5pf09b   monitoring_promtail        global       1/1        grafana/promtail:latest
sxzu8beiqg83   monitoring_uptime-kuma     replicated   1/1        louislam/uptime-kuma:latest
ztpca4x070m2   swarajdesk_admin-be        replicated   1/1        ogadityahota/sih-swarajdesk-admin-be:latest
x8dzqjgy3a7q   swarajdesk_agents          replicated   1/1        ogadityahota/swarajdesk-agents:latest
haaj3l3poda9   swarajdesk_blockchain-be   replicated   1/1        ogadityahota/swarajdesk-blockchain-be:latest
wucci2zl5aaf   swarajdesk_compqueue       replicated   1/1        ogadityahota/swarajdesk-comp-queue:latest
plfpksoob7bx   swarajdesk_redis           replicated   1/1        redis:7-alpine
gamrbi3jjhqj   swarajdesk_report-ai       replicated   0/1        mistaholmes/report-ai-model-survey:latest
icu0trkyxrst   swarajdesk_user-be         replicated   1/1        ogadityahota/swarajdesk-user-be:latest
dzjj3zhh33j4   traefik_traefik            replicated   1/1        traefik:v3.0
aditya@instance-20260418-102914:~$ docker service logs swarajdesk_user-be -f
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | ◇ injected env (0) from .env // tip: ⌘ suppress logs { quiet: true }
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | ◇ injected env (0) from .env // tip: ⌘ enable debugging { debug: true }
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | ◇ injected env (0) from .env.bootstrap // tip: ⌘ custom filepath { path: '/custom/path/.env' }
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | ◇ injected env (0) from .env // tip: ⌘ custom filepath { path: '/custom/path/.env' }
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | [AWS Secrets] Retrieving secrets from AWS Secrets Manager...
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | ✅ Redis Complaint Cache connected
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | [AWS Secrets] Skipped (local override): NODE_ENV
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | [AWS Secrets] Skipped (local override): PORT
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | [AWS Secrets] Skipped (local override): WS_PORT
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | [AWS Secrets] Skipped (local override): frontend
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | [AWS Secrets] Skipped (local override): backend
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | [AWS Secrets] Skipped (local override): worker
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | [AWS Secrets] Skipped (local override): frontend_admin
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | [AWS Secrets] Skipped (local override): backend_admin
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | [AWS Secrets] Skipped (local override): PRISMA_CLIENT_ENGINE_TYPE
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | [AWS Secrets] Skipped (local override): DATABASE_URL
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | [AWS Secrets] Skipped (local override): JWT_SECRET
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | [AWS Secrets] Skipped (local override): REDIS_URL
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | [AWS Secrets] Skipped (local override): AWS_REGION
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | [AWS Secrets] Skipped (local override): S3_AWS_ACCESS_KEY_ID
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | [AWS Secrets] Skipped (local override): S3_AWS_SECRET_ACCESS_KEY
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | [AWS Secrets] Skipped (local override): AWS_BUCKET
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | [AWS Secrets] Skipped (local override): SECRETS_AWS_ACCESS_KEY_ID
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | [AWS Secrets] Skipped (local override): SECRETS_AWS_SECRET_ACCESS_KEY
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | [AWS Secrets] Skipped (local override): SECRET_NAME_AWS_USER_BE
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | [AWS Secrets] Skipped (local override): pinAPIBase
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | [AWS Secrets] Successfully retrieved and injected secrets
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | Prisma client initialized
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | User Queue Redis client connected successfully
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | User queue service initialized
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | Complaint Queue Redis client connected successfully
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | Complaint queue service initialized
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | Server is running on port 3000
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | Environment: production
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | ✅ Redis Like Counter Service connected
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | ✅ Like sync worker started
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | 🚀 WebSocket server running on ws://localhost:3001/ws
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | WebSocket server is running on port 3001
^Caditya@instance-20260418-102914:~$ ^C
aditya@instance-20260418-102914:~$ ^C
aditya@instance-20260418-102914:~$ ^C
aditya@instance-20260418-102914:~$ docker service logs swarajdesk_admin-be -f
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | [AWS Secrets] DISABLED - Using local env files and Docker ENV variables
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | [AWS Secrets] REDIS_URL from env: redis://default:strongpassword@redis:6379
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | Prisma client initialized
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | [Redis] Connecting to redis://<redacted>@redis:6379
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | Redis client connected
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | Redis client ready
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | [AutoAssign] Polling started (15s interval)
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | [SLA-Cron] Starting — will tick every 15 minutes
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | Server is running on port 3002
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | Environment: production
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | Processed Complaint Queue Redis client connected successfully
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | Blockchain Queue Redis client connected successfully
^Caditya@instance-20260418-102914:~$ ^C
aditya@instance-20260418-102914:~$


# Traefik v3 — Swarm mode ingress with Let's Encrypt TLS
# Deploy: docker stack deploy -c traefik.yaml traefik

services:
  traefik:
    image: traefik:v3.0
    command:
      - "--api.dashboard=true"
      - "--api.insecure=true"
      - "--providers.swarm=true"
      - "--providers.swarm.exposedByDefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--entrypoints.web.http.redirections.entryPoint.to=websecure"
      - "--entrypoints.web.http.redirections.entryPoint.scheme=https"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=adityahota99@gmail.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--metrics.prometheus=true"
      - "--metrics.prometheus.entryPoint=metrics"
      - "--entrypoints.metrics.address=:8082"
    ports:
      - target: 80
        published: 80
        mode: host
      - target: 443
        published: 443
        mode: host
      - target: 8080
        published: 8080
        mode: host
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-certs:/letsencrypt
    networks:
      - swarajdesk
    deploy:
      placement:
        constraints:
          - node.role == manager
      restart_policy:
        condition: any

networks:
  swarajdesk:
    external: true

volumes:
  traefik-certs:
 


