# Kubernetes Manifests for user-be

This folder contains Kubernetes manifests for deploying the user-be service.

## Files

- `deployment.yaml` - Deployment configuration with health checks
- `service.yaml` - ClusterIP service exposing ports 3000 (HTTP) and 3001 (WebSocket)
- `ingress.yaml` - Ingress rules for Traefik
- `secrets.yaml` - Kubernetes secrets (⚠️ Don't commit to git with real values!)

## Deployment

```bash
# Apply all manifests
kubectl apply -f k8s/

# Or apply individually
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

## Endpoints

After deployment, the service will be available at:
- **HTTP API**: `http://user-be.adityahota.online`
- **WebSocket**: `ws://ws-user-be.adityahota.online/ws`

## Building and Pushing Docker Image

```bash
# Build the image
docker build -t user-be:latest .

# Tag for your registry
docker tag user-be:latest your-registry/user-be:latest

# Push to registry
docker push your-registry/user-be:latest
```

Then update `deployment.yaml` with your registry image path.

## Notes

- The deployment uses AWS Secrets Manager to retrieve additional secrets at runtime
- Health checks are configured on `/api/health`
- Resource limits: 512Mi memory, 500m CPU
