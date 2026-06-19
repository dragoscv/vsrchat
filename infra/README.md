# Infrastructure (Terraform · GCP)

Provisions the vsrchat relay on Cloud Run, plus Artifact Registry and a
least-privilege runtime service account.

## Prerequisites

- `gcloud` authenticated and pointed at the `vsrchat` project.
- Terraform >= 1.9.

## Usage

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # edit allowlist + ids
terraform init
terraform apply
```

Outputs include `relay_ws_url` — put it in:

- the extension setting `vsrchat.relayUrl`, and
- the PWA env `NEXT_PUBLIC_RELAY_URL`.

## Notes

- The relay is publicly reachable (Cloud Run `allUsers` invoker) but enforces a
  GitHub allowlist in-app, and all payloads are end-to-end encrypted.
- `min_instances = 0` keeps cost near zero (scale to zero). Set to `1` for
  instant phone response at a small fixed cost.
- The relay endpoint is `/health` (not `/healthz`, which Google reserves).
