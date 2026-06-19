# Deploying the relay

## Option A — Terraform (recommended)

See [`infra/README.md`](../infra/README.md). One `terraform apply` provisions
Artifact Registry, the runtime service account, and the Cloud Run service.

## Option B — Manual gcloud

```bash
PROJECT=vsrchat
REGION=europe-west1

# 1. Enable APIs
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  --project "$PROJECT"

# 2. Create the Docker repo
gcloud artifacts repositories create vsrchat \
  --repository-format=docker --location="$REGION" --project "$PROJECT"

# 3. Build & push (from repo root)
gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet
IMAGE="$REGION-docker.pkg.dev/$PROJECT/vsrchat/relay:latest"
docker build -f apps/relay/Dockerfile -t "$IMAGE" .
docker push "$IMAGE"

# 4. Deploy (WebSockets need a long timeout)
gcloud run deploy vsrchat-relay \
  --project "$PROJECT" --region "$REGION" --image "$IMAGE" \
  --allow-unauthenticated --port 8080 --timeout 3600 \
  --min-instances 0 --max-instances 2 \
  --set-env-vars "VSRCHAT_ALLOWED_GITHUB_IDS=123456,VSRCHAT_ALLOWED_GITHUB_LOGINS=dragoscv"
```

## Verify

```bash
curl https://<your-relay>.run.app/health
# { "ok": true, "service": "vsrchat-relay", ... }
```

> The health endpoint is `/health`. Do **not** use `/healthz` — Google's Front
> End reserves it and returns a branded 404 before reaching your container.

## CI/CD

`.github/workflows/release-relay.yml` is **smart and version-driven**:

- It only runs when files under `apps/relay/`, `packages/protocol/`, or
  `packages/crypto/` change (path-filtered).
- A **gate job** deploys only when (a) the GCP secrets are configured **and**
  (b) the relay version in `apps/relay/package.json` is new (no `relay-v<version>`
  tag yet). Otherwise it skips cleanly — no failed runs, no redundant deploys.
- On deploy it builds + pushes the image, deploys to Cloud Run, runs a
  `/health` check, then **auto-creates the `relay-v<version>` tag**.

To cut a relay release: bump `apps/relay/package.json` version + add a CHANGELOG
entry, push to `main`. To re-deploy an unchanged version, run the workflow
manually with **force: true**.

Required repo secrets:

- `GCP_WIF_PROVIDER`, `GCP_DEPLOY_SA` (Workload Identity Federation)
- `VSRCHAT_ALLOWED_GITHUB_IDS`, `VSRCHAT_ALLOWED_GITHUB_LOGINS`
