# SwarajDesk Deployment Routing Postmortem

Date: 2026-04-19

## Scope

This note explains:

- why `Traefik 404 page not found` is still happening on public URLs
- why `ansible-playbook -i inventory.ini provision-vm.yaml` keeps failing
- why repeated Traefik and Ansible edits did not fully solve the problem
- what the current DNS records are in this repo

This file is intentionally a diagnosis only. No application code is changed here.

## What Is Proven Right Now

From the VM output shared in the terminal:

- `traefik_traefik` is `1/1`
- all monitoring services are `1/1`
- `swarajdesk_admin-be`, `swarajdesk_user-be`, `swarajdesk_agents`, `swarajdesk_blockchain-be`, `swarajdesk_compqueue`, and `swarajdesk_redis` are `1/1`
- `swarajdesk_report-ai` is still `0/1`

From the service logs shared:

- `admin-be` starts successfully on port `3002`
- `user-be` starts successfully on port `3000`
- `user-be` websocket starts successfully on port `3001`
- Redis connectivity for those services is working

From the public symptom shared:

- `https://gsc-admin-be.abhasbehera.in/api/health` returns Traefik `404`
- `https://gsc-user-be.abhasbehera.in/api/health` returns Traefik `404`
- `https://gsc-monitoring.abhasbehera.in/grafana` returns Traefik `404`

From the DNS screenshot shared by the user:

- all public `A` records are mapped to `34.9.37.21`
- all backend/monitoring records shown are Cloudflare `Proxied`

From additional terminal checks shared later:

- `dig +short gsc-user-be.abhasbehera.in` returns `172.67.131.34` and `104.21.3.195`
- `docker service inspect traefik_traefik` shows Traefik is started with the Swarm provider enabled
- `docker service inspect monitoring_grafana` shows the expected Traefik labels are present on the Swarm service
- `docker service logs traefik_traefik` shows repeated Swarm provider errors:
  - `client version 1.24 is too old. Minimum supported API version is 1.40`
  - `Provider error ... providerName=swarm`
  - the same error keeps appearing in later log pulls as well, so it is not a one-time startup message

That combination proves one important thing:

- the application containers are not the direct reason for the public `404`
- the failure is at the ingress layer, not at DNS target selection
- the failure is specifically inside Traefik's Swarm provider runtime, not just in the service labels

## The Two Separate Problems

There are two different failures, and they keep getting mixed together:

### 1. Public routing failure

Traefik is reachable, but the requested host/path is not matching an active router on the live ingress instance.

This is why the browser shows a Traefik `404` instead of an application error.

With the later Traefik logs, this can now be stated more precisely:

- the Swarm provider is failing to talk to the Docker daemon because of a Docker API version mismatch
- because of that, Traefik cannot load routers/services dynamically from Swarm
- therefore public requests fall through to Traefik's default `404 page not found`
- the repeated later log lines show this condition is ongoing, not transient

### 2. Provisioning failure

The Ansible playbook fails because `swarajdesk_report-ai` is `0/1`.

That is a stack-health failure, not a Traefik-routing failure.

So:

- Traefik `404` explains why public URLs fail
- `report-ai 0/1` explains why `provision-vm.yaml` keeps ending in failure

They are related only because both happen in the same deployment, not because they are the same bug.

## Why The Repeated Fixes Still Did Not Solve It

### 1. The repo has had more than one problem at the same time

Earlier, the deployment config did have label and route gaps. Those were real issues.

But the current symptom is broader than a single missing label:

- `user-be` public route fails
- `admin-be` public route fails
- monitoring route fails

When healthy services across two different stacks all return Traefik `404`, the problem is no longer "one service has a bad healthcheck path". It is a live ingress registration problem.

### 2. The DNS documentation in the repo , but live DNS is now confirmed


However, the user has now confirmed via the DNS provider screenshot that the live public records are mapped to `34.9.37.21`.

So the stale repo file is still a documentation bug, but it is no longer the primary explanation for the live `404`.

The later `dig` result is also consistent with this:

- because Cloudflare proxy is enabled, public DNS no longer returns the origin VM IP directly
- instead it returns Cloudflare edge IPs such as `172.67.131.34` and `104.21.3.195`

So this is not evidence of wrong DNS. It is the expected result for orange-cloud proxied records.

### 3. The live checks now prove the service labels exist, but Traefik is failing before it can use them

The decisive runtime checks are now available:

- `docker service inspect traefik_traefik` shows the Swarm provider is enabled
- `docker service inspect monitoring_grafana` shows the expected labels are present on the service
- `docker service logs traefik_traefik` shows the provider repeatedly failing with:
  - `client version 1.24 is too old. Minimum supported API version is 1.40`
  - repeated retries several minutes later, which proves Traefik never recovers into a healthy Swarm-discovery state

So the problem is no longer "maybe the labels were not deployed".

The labels are present.

The actual failure is that Traefik cannot read Swarm state from Docker successfully, so it never activates the routers from those labels.

So the diagnosis is no longer:

- "labels might be wrong"

It is now:

- "labels are present, but Traefik cannot consume Swarm metadata because its Docker client/API negotiation is failing"

### 4. The `curl https://127.0.0.1/...` checks from the laptop do not test the VM ingress

The commands:

- `curl -k -H 'Host: gsc-user-be.abhasbehera.in' https://127.0.0.1/api/health`
- `curl -k -H 'Host: gsc-monitoring.abhasbehera.in' https://127.0.0.1/grafana`

were run from the local machine, not from the VM shell.

So `127.0.0.1` there means:

- the developer laptop itself
- not the cloud VM
- not the Traefik container

That is why both commands failed with:

- `Couldn't connect to server`

This does not indicate a Traefik router mismatch. It only indicates that nothing on the local laptop is listening on port `443`.

### 5. `report-ai` has a local-vs-Swarm healthcheck mismatch

This is the clearest confirmed deployment bug for the AI service.

In local compose, `packages/deployment/docker-compose.yaml` checks:

- `http://localhost:8000/health`

In Swarm, `packages/deployment/swarm/stack.yaml` checks:

- `http://localhost:8000/`

That means the same image is being judged by two different healthcheck routes in two different deployment modes.

If the image serves `GET /health` but not `GET /` with HTTP 200, then this exact pattern happens:

- local `docker compose` can look fine
- Swarm healthcheck fails
- Swarm keeps the service at `0/1`
- Ansible fails while waiting for the stack to become healthy

This is the strongest evidenced explanation for the repeated `report-ai` deployment failure.

### 6. Ansible kept failing for `report-ai`, which masked the routing investigation

Because `provision-vm.yaml` waits until all services are healthy, `report-ai 0/1` keeps making the playbook end in failure.

That creates noise during debugging:

- the app and monitoring stacks may already be mostly up
- but the playbook still ends with a red failure state
- so Traefik diagnosis gets mixed with an unrelated unhealthy AI service

### 7. Traefik Swarm networking docs are not perfectly consistent

Traefik's Swarm docs are confusing here:

- the install/config page says `providers.swarm.network` can be overridden with `traefik.docker.network`
- the routing/provider page documents the specific Swarm label as `traefik.swarm.network`

That inconsistency made earlier label-focused fixes reasonable, but the new runtime logs are more important than the docs ambiguity.

The runtime evidence now overrides the earlier uncertainty:

- labels exist
- Traefik starts
- Traefik fails to read Swarm metadata from Docker

Official references:

- Traefik Swarm provider docs: `https://doc.traefik.io/traefik/v3.3/reference/install-configuration/providers/swarm/`
- Traefik Swarm routing docs: `https://doc.traefik.io/traefik/v3.3/routing/providers/swarm/`

## The Most Accurate Root-Cause Statement

The most accurate statement that can be made from the current evidence is this:

> The public hostnames are reaching the correct Traefik instance, the Swarm services do have Traefik labels, but Traefik's Swarm provider is failing against the Docker daemon with `client version 1.24 is too old. Minimum supported API version is 1.40`, so the routers are not being loaded and public requests fall through to Traefik `404`.

That statement is fully supported by the evidence.

What can now be ruled out with high confidence is:

- public DNS pointing at the wrong VM
- missing Traefik labels on `monitoring_grafana`

What remains as the primary explanation is already visible in Traefik logs:

- Docker API compatibility/runtime access failure inside Traefik's Swarm provider
- and that failure is persistent across repeated retries, not a temporary bootstrap race

## Why `report-ai` Keeps Breaking Ansible

The playbook `packages/deployment/ansible/provision-vm.yaml` waits for every stack service to reach desired replicas.

Right now:

- `swarajdesk_report-ai` stays `0/1`
- the playbook retries until timeout
- then the whole provisioning run fails

This does not prove a Traefik issue.

It proves the `report-ai` service itself is not becoming healthy in Swarm.

With the current repo state, the strongest concrete reason is the healthcheck divergence:

- local compose uses `/health`
- Swarm uses `/`

So `report-ai` can absolutely appear "running good" in local `docker compose` and still fail in Swarm deployment.

Based on the repo, `report-ai` is also the least integrated service in the deployment set:

- it uses a separate third-party image
- it is not part of the main backend codebase
- its runtime contract is not validated anywhere else in the playbook

So it has been acting as a deployment blocker and a distraction at the same time.

## Current DNS Records In This Repo

The current machine-targeting DNS data in the repo is in `packages/deployment/dns.txt`, and it points all public hostnames to `34.9.37.21`.

### Current A records

- `gsc-user-be.abhasbehera.in` -> `34.9.37.21`
- `gsc-ws-user-be.abhasbehera.in` -> `34.9.37.21`
- `gsc-admin-be.abhasbehera.in` -> `34.9.37.21`
- `gsc-comp-queue.abhasbehera.in` -> `34.9.37.21`
- `gsc-agents-be.abhasbehera.in` -> `34.9.37.21`
- `gsc-blockchain-be.abhasbehera.in` -> `34.9.37.21`
- `gsc-report-ai.abhasbehera.in` -> `34.9.37.21`
- `gsc-monitoring.abhasbehera.in` -> `34.9.37.21`

### Repo inconsistency to note

`packages/deployment/DNS_RECORDS.md` still says the ingress IP is `34.46.205.195`.

That file is stale relative to:

- `packages/deployment/dns.txt`
- `packages/deployment/ansible/inventory.ini`

## Final Conclusion

The repeated errors did not continue because the problem was "too complex". They continued because the deployment had multiple overlapping failures and the repo itself contained conflicting infrastructure truth:

- public DNS documentation disagreed with the actual VM target, even though live DNS is now confirmed on `34.9.37.21`
- Traefik routing symptoms were diagnosed from config edits before the decisive runtime logs were collected
- the decisive runtime logs now show the real ingress blocker: a persistent Traefik Swarm provider failure against the Docker API
- `report-ai` had a different healthcheck in Swarm than in local compose
- Ansible kept failing on `report-ai 0/1`, which is separate from the public Traefik `404`

So the repeated failures came from mixing three layers together:

- DNS target selection
- Traefik live router registration
- stack health gating in Ansible

The single safest takeaway is:

- the applications are mostly up
- public DNS is correctly pointed at `34.9.37.21`
- public DNS returns Cloudflare edge IPs because proxying is enabled, which is expected
- public ingress is still not correctly active for the requested hostnames
- the direct reason for public `404` is now known: Traefik's Swarm provider is failing continuously with a Docker API version mismatch
- `report-ai` is still unhealthy in Swarm, and the repo currently gives it a different healthcheck path than local compose

## What Would Be The Decisive Checks

Most of the decisive checks are now already collected.

The single most decisive piece of evidence is:

- `docker service logs traefik_traefik --tail 10`

because it directly shows:

- `client version 1.24 is too old. Minimum supported API version is 1.40`
- the same error recurring in later log pulls, which proves the provider stays broken over time

That log explains the public routing failure more directly than any label inspection or browser symptom.


# more

aditya@instance-20260418-102914:~$ docker service logs traefik_traefik --tail 10
traefik_traefik.1.bwhsgaqd0omc@instance-20260418-102914    | 2026-04-19T12:47:23Z ERR Failed to retrieve information of the docker client and server host error="Error response from daemon: client version 1.24 is too old. Minimum supported API version is 1.40, please upgrade your client to a newer version" providerName=swarm
traefik_traefik.1.590ae563mtpx@instance-20260418-102914    | 2026-04-19T12:12:08Z ERR Provider error, retrying in 5.769385644s error="Error response from daemon: client version 1.24 is too old. Minimum supported API version is 1.40, please upgrade your client to a newer version" providerName=swarm
traefik_traefik.1.590ae563mtpx@instance-20260418-102914    | 2026-04-19T12:12:11Z ERR error="accept tcp [::]:8082: use of closed network connection" entryPointName=metrics
traefik_traefik.1.bwhsgaqd0omc@instance-20260418-102914    | 2026-04-19T12:47:23Z ERR Provider error, retrying in 3.679022498s error="Error response from daemon: client version 1.24 is too old. Minimum supported API version is 1.40, please upgrade your client to a newer version" providerName=swarm
traefik_traefik.1.590ae563mtpx@instance-20260418-102914    | 2026-04-19T12:12:11Z ERR Error while starting server error="accept tcp [::]:8082: use of closed network connection" entryPointName=metrics
traefik_traefik.1.bwhsgaqd0omc@instance-20260418-102914    | 2026-04-19T12:47:27Z ERR Failed to retrieve information of the docker client and server host error="Error response from daemon: client version 1.24 is too old. Minimum supported API version is 1.40, please upgrade your client to a newer version" providerName=swarm
traefik_traefik.1.590ae563mtpx@instance-20260418-102914    | 2026-04-19T12:12:11Z ERR error="accept tcp [::]:443: use of closed network connection" entryPointName=websecure
traefik_traefik.1.bwhsgaqd0omc@instance-20260418-102914    | 2026-04-19T12:47:27Z ERR Provider error, retrying in 4.957253431s error="Error response from daemon: client version 1.24 is too old. Minimum supported API version is 1.40, please upgrade your client to a newer version" providerName=swarm
traefik_traefik.1.590ae563mtpx@instance-20260418-102914    | 2026-04-19T12:12:11Z ERR Error while starting server error="accept tcp [::]:443: use of closed network connection" entryPointName=websecure
traefik_traefik.1.bwhsgaqd0omc@instance-20260418-102914    | 2026-04-19T12:47:32Z ERR Failed to retrieve information of the docker client and server host error="Error response from daemon: client version 1.24 is too old. Minimum supported API version is 1.40, please upgrade your client to a newer version" providerName=swarm
traefik_traefik.1.590ae563mtpx@instance-20260418-102914    | 2026-04-19T12:12:11Z ERR error="accept tcp [::]:80: use of closed network connection" entryPointName=web
traefik_traefik.1.bwhsgaqd0omc@instance-20260418-102914    | 2026-04-19T12:47:32Z ERR Provider error, retrying in 6.047001764s error="Error response from daemon: client version 1.24 is too old. Minimum supported API version is 1.40, please upgrade your client to a newer version" providerName=swarm
traefik_traefik.1.590ae563mtpx@instance-20260418-102914    | 2026-04-19T12:12:11Z ERR error="close tcp [::]:80: use of closed network connection" entryPointName=web
traefik_traefik.1.bwhsgaqd0omc@instance-20260418-102914    | 2026-04-19T12:47:38Z ERR Failed to retrieve information of the docker client and server host error="Error response from daemon: client version 1.24 is too old. Minimum supported API version is 1.40, please upgrade your client to a newer version" providerName=swarm
traefik_traefik.1.590ae563mtpx@instance-20260418-102914    | 2026-04-19T12:12:11Z ERR error="accept tcp [::]:8080: use of closed network connection" entryPointName=traefik
traefik_traefik.1.590ae563mtpx@instance-20260418-102914    | 2026-04-19T12:12:11Z ERR error="close tcp [::]:8080: use of closed network connection" entryPointName=traefik
traefik_traefik.1.bwhsgaqd0omc@instance-20260418-102914    | 2026-04-19T12:47:38Z ERR Provider error, retrying in 6.575188928s error="Error response from daemon: client version 1.24 is too old. Minimum supported API version is 1.40, please upgrade your client to a newer version" providerName=swarm
traefik_traefik.1.bwhsgaqd0omc@instance-20260418-102914    | 2026-04-19T12:47:45Z ERR Failed to retrieve information of the docker client and server host error="Error response from daemon: client version 1.24 is too old. Minimum supported API version is 1.40, please upgrade your client to a newer version" providerName=swarm
traefik_traefik.1.bwhsgaqd0omc@instance-20260418-102914    | 2026-04-19T12:47:45Z ERR Provider error, retrying in 16.203918774s error="Error response from daemon: client version 1.24 is too old. Minimum supported API version is 1.40, please upgrade your client to a newer version" providerName=swarm
traefik_traefik.1.590ae563mtpx@instance-20260418-102914    | 2026-04-19T12:12:12Z ERR Cannot retrieve data error="context canceled" providerName=swarm
aditya@instance-20260418-102914:~$

aditya@instance-20260418-102914:~$ docker service inspect traefik_traefik --format '{{json .Spec.TaskTemplate.ContainerSpec.Args}}'
["--api.dashboard=true","--api.insecure=true","--providers.swarm=true","--providers.swarm.exposedByDefault=false","--providers.swarm.network=swarajdesk","--entrypoints.web.address=:80","--entrypoints.websecure.address=:443","--entrypoints.web.http.redirections.entryPoint.to=websecure","--entrypoints.web.http.redirections.entryPoint.scheme=https","--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web","--certificatesresolvers.letsencrypt.acme.email=adityahota99@gmail.com","--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json","--metrics.prometheus=true","--metrics.prometheus.entryPoint=metrics","--entrypoints.metrics.address=:8082"]
aditya@instance-20260418-102914:~$ docker service inspect monitoring_grafana --format '{{json .Spec.Labels}}'
{"com.docker.stack.image":"grafana/grafana:latest","com.docker.stack.namespace":"monitoring","traefik.docker.network":"swarajdesk","traefik.enable":"true","traefik.http.middlewares.monitoring-root-redirect.redirectregex.regex":"^https?://gsc-monitoring\\.abhasbehera\\.in/$","traefik.http.middlewares.monitoring-root-redirect.redirectregex.replacement":"https://gsc-monitoring.abhasbehera.in/grafana","traefik.http.routers.grafana.entrypoints":"websecure","traefik.http.routers.grafana.rule":"Host(`gsc-monitoring.abhasbehera.in`) && PathPrefix(`/grafana`)","traefik.http.routers.grafana.service":"grafana","traefik.http.routers.grafana.tls.certresolver":"letsencrypt","traefik.http.routers.monitoring-root.entrypoints":"websecure","traefik.http.routers.monitoring-root.middlewares":"monitoring-root-redirect","traefik.http.routers.monitoring-root.rule":"Host(`gsc-monitoring.abhasbehera.in`) && Path(`/`)","traefik.http.routers.monitoring-root.service":"noop@internal","traefik.http.routers.monitoring-root.tls.certresolver":"letsencrypt","traefik.http.services.grafana.loadbalancer.server.port":"3000"}
aditya@instance-20260418-102914:~$ docker service logs traefik_traefik --tail 10

sih-swarajdesk-2025/packages/deployment on  main [$!?]
❯ dig +short gsc-user-be.abhasbehera.in
172.67.131.34
104.21.3.195
sih-swarajdesk-2025/packages/deployment on  main [$!?]
❯ curl -k -H 'Host: gsc-user-be.abhasbehera.in' https://127.0.0.1/api/health
curl: (7) Failed to connect to 127.0.0.1 port 443 after 0 ms: Couldn't connect to server
sih-swarajdesk-2025/packages/deployment on  main [$!?]
❯ curl -k -H 'Host: gsc-monitoring.abhasbehera.in' https://127.0.0.1/grafana
curl: (7) Failed to connect to 127.0.0.1 port 443 after 0 ms: Couldn't connect to server
sih-swarajdesk-2025/packages/deployment on  main [$!?]


aditya@instance-20260418-102914:~$ docker service logs swarajdesk_user-be -f
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | ◇ injected env (0) from .env // tip: ⌘ custom filepath { path: '/custom/path/.env' }
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | ◇ injected env (0) from .env // tip: ⌘ override existing { override: true }
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | ◇ injected env (0) from .env.bootstrap // tip: ◈ encrypted .env [www.dotenvx.com]
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | ◇ injected env (0) from .env // tip: ⌘ custom filepath { path: '/custom/path/.env' }
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | [AWS Secrets] Retrieving secrets from AWS Secrets Manager...
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | ✅ Redis Complaint Cache connected
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | [AWS Secrets] Skipped (local override): NODE_ENV
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | [AWS Secrets] Skipped (local override): PORT
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | [AWS Secrets] Skipped (local override): WS_PORT
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | [AWS Secrets] Skipped (local override): frontend
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | [AWS Secrets] Skipped (local override): backend
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | [AWS Secrets] Skipped (local override): worker
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | [AWS Secrets] Skipped (local override): frontend_admin
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | [AWS Secrets] Skipped (local override): backend_admin
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | [AWS Secrets] Skipped (local override): PRISMA_CLIENT_ENGINE_TYPE
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | [AWS Secrets] Skipped (local override): DATABASE_URL
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | [AWS Secrets] Skipped (local override): JWT_SECRET
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | [AWS Secrets] Skipped (local override): REDIS_URL
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | [AWS Secrets] Skipped (local override): AWS_REGION
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | [AWS Secrets] Skipped (local override): S3_AWS_ACCESS_KEY_ID
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | [AWS Secrets] Skipped (local override): S3_AWS_SECRET_ACCESS_KEY
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | [AWS Secrets] Skipped (local override): AWS_BUCKET
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | [AWS Secrets] Skipped (local override): SECRETS_AWS_ACCESS_KEY_ID
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | [AWS Secrets] Skipped (local override): SECRETS_AWS_SECRET_ACCESS_KEY
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | [AWS Secrets] Skipped (local override): SECRET_NAME_AWS_USER_BE
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | [AWS Secrets] Skipped (local override): pinAPIBase
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | [AWS Secrets] Successfully retrieved and injected secrets
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | Prisma client initialized
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | User Queue Redis client connected successfully
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | User queue service initialized
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | Complaint Queue Redis client connected successfully
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | Complaint queue service initialized
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | Server is running on port 3000
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | Environment: production
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | ✅ Redis Like Counter Service connected
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | ✅ Like sync worker started
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | 🚀 WebSocket server running on ws://localhost:3001/ws
swarajdesk_user-be.1.9bhs3c7pynag@instance-20260418-102914    | WebSocket server is running on port 3001
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
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | Received SIGTERM. Shutting down gracefully...
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | 🛑 Like sync worker stopped
swarajdesk_user-be.1.kc5mnnse5q7m@instance-20260418-102914    | 🛑 WebSocket server stopped
^Caditya@instance-20260418-102914:~$ ^C
aditya@instance-20260418-102914:~$ docker service logs swarajdesk_admin-be -f
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [AWS Secrets] Retrieving secrets from AWS Secrets Manager...
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [AWS Secrets] Skipped (local override): NODE_ENV
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [AWS Secrets] Skipped (local override): ADMIN_BE_PORT
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [AWS Secrets] Skipped (local override): ADMIN_BE_URL
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [AWS Secrets] Skipped (local override): DATABASE_URL
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [AWS Secrets] Skipped (local override): JWT_SECRET
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [AWS Secrets] Skipped (local override): REDIS_URL
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [AWS Secrets] Skipped (local override): AWS_REGION
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | [AWS Secrets] DISABLED - Using local env files and Docker ENV variables
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [AWS Secrets] Injected: ALLOWED_ORIGINS
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | [AWS Secrets] REDIS_URL from env: redis://default:strongpassword@redis:6379
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | Prisma client initialized
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | [Redis] Connecting to redis://<redacted>@redis:6379
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | Redis client connected
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [AWS Secrets] Skipped (local override): DEFAULT_MODERATION_URL
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | Redis client ready
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [AWS Secrets] Injected: CLIENT_EMAIL
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | [AutoAssign] Polling started (15s interval)
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | [SLA-Cron] Starting — will tick every 15 minutes
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | Server is running on port 3002
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [AWS Secrets] Injected: PRIVATE_KEY
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | Environment: production
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [AWS Secrets] Injected: GCP_PROJECT_ID
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | Processed Complaint Queue Redis client connected successfully
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [AWS Secrets] Injected: GCP_LOCATION
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [AWS Secrets] Injected: ENDPOINT_ID
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [AWS Secrets] Skipped (local override): SECRETS_AWS_ACCESS_KEY_ID
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [AWS Secrets] Skipped (local override): SECRETS_AWS_SECRET_ACCESS_KEY
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [AWS Secrets] Skipped (local override): SECRET_NAME_AWS_USER_BE
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [AWS Secrets] Skipped (local override): S3_AWS_ACCESS_KEY_ID
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | Blockchain Queue Redis client connected successfully
swarajdesk_admin-be.1.t8w4d07ztell@instance-20260418-102914    | Received SIGTERM. Shutting down gracefully...
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [AWS Secrets] Skipped (local override): S3_AWS_SECRET_ACCESS_KEY
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [AWS Secrets] Skipped (local override): AWS_BUCKET
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [AWS Secrets] Successfully retrieved and injected secrets
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | Prisma client initialized
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [Redis] Connecting to redis://<redacted>@redis:6379
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | Redis client connected
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | Redis client ready
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [AutoAssign] Polling started (15s interval)
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | [SLA-Cron] Starting — will tick every 15 minutes
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | Server is running on port 3002
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | Environment: production
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | Processed Complaint Queue Redis client connected successfully
swarajdesk_admin-be.1.qtvsbpw7cue4@instance-20260418-102914    | Blockchain Queue Redis client connected successfully
^Caditya@instance-20260418-102914:~$ ^C
aditya@instance-20260418-102914:~$ ^C
aditya@instance-20260418-102914:~$ docker service ls
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
aditya@instance-20260418-102914:~$


sih-swarajdesk-2025/packages/deployment on  main [$!?]
❯ sudo docker compose up -d
[sudo] password for aditya:
[+] up 8/8
 ✔ Network deployment_swarajdesk        Created                                                                                                                                                            0.0s
 ✔ Container swarajdesk-redis           Healthy                                                                                                                                                            5.9s
 ✔ Container deployment-user-be-1       Started                                                                                                                                                            6.3s
 ✔ Container deployment-agents-1        Started                                                                                                                                                            6.2s
 ✔ Container deployment-compqueue-1     Started                                                                                                                                                            6.3s
 ✔ Container deployment-admin-be-1      Started                                                                                                                                                            6.3s
 ✔ Container deployment-report-ai-1     Started                                                                                                                                                            6.2s
 ✔ Container deployment-blockchain-be-1 Started                                                                                                                                                            6.2s
sih-swarajdesk-2025/packages/deployment on  main [$!?]
❯ sudo docker ps
CONTAINER ID   IMAGE                                          COMMAND                  CREATED          STATUS                            PORTS                                                             NAMES
b6dff56c69fc   ogadityahota/swarajdesk-agents:latest          "/usr/local/bin/dock…"   13 seconds ago   Up 7 seconds (healthy)            0.0.0.0:3040->3040/tcp, [::]:3040->3040/tcp                       deployment-agents-1
1f0717fc2e1b   ogadityahota/sih-swarajdesk-admin-be:latest    "/usr/local/bin/dock…"   13 seconds ago   Up 7 seconds (healthy)            0.0.0.0:3002->3002/tcp, [::]:3002->3002/tcp                       deployment-admin-be-1
8a435ea402ff   ogadityahota/swarajdesk-blockchain-be:latest   "/usr/local/bin/dock…"   13 seconds ago   Up 7 seconds (healthy)            0.0.0.0:4100->4100/tcp, [::]:4100->4100/tcp                       deployment-blockchain-be-1
455a94b6d6a0   mistaholmes/report-ai-model-survey:latest      "uvicorn main:app --…"   13 seconds ago   Up 7 seconds (health: starting)   0.0.0.0:8000->8000/tcp, [::]:8000->8000/tcp                       deployment-report-ai-1
bb3fe0ac9399   ogadityahota/swarajdesk-comp-queue:latest      "/usr/local/bin/dock…"   13 seconds ago   Up 7 seconds (healthy)            0.0.0.0:3005->3005/tcp, [::]:3005->3005/tcp                       deployment-compqueue-1
3f4c31b2321f   ogadityahota/swarajdesk-user-be:latest         "/usr/local/bin/dock…"   13 seconds ago   Up 7 seconds (healthy)            0.0.0.0:3000-3001->3000-3001/tcp, [::]:3000-3001->3000-3001/tcp   deployment-user-be-1
f7131aa00cd6   redis:7-alpine                                 "docker-entrypoint.s…"   13 seconds ago   Up 13 seconds (healthy)           0.0.0.0:6379->6379/tcp, [::]:6379->6379/tcp                       swarajdesk

