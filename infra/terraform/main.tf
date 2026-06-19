resource "google_artifact_registry_repository" "containers" {
  project       = var.project_id
  location      = var.region
  repository_id = "vsrchat"
  description   = "vsrchat container images"
  format        = "DOCKER"

  depends_on = [google_project_service.enabled]
}

# Dedicated runtime service account for the relay (least privilege).
resource "google_service_account" "relay" {
  project      = var.project_id
  account_id   = "vsrchat-relay"
  display_name = "vsrchat relay runtime"
}

resource "google_cloud_run_v2_service" "relay" {
  project             = var.project_id
  name                = "vsrchat-relay"
  location            = var.region
  deletion_protection = false
  ingress             = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.relay.email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    # WebSockets need a long request timeout.
    timeout = "3600s"

    containers {
      image = var.relay_image != "" ? var.relay_image : "${var.region}-docker.pkg.dev/${var.project_id}/vsrchat/relay:latest"

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "256Mi"
        }
        cpu_idle = true
      }

      env {
        name  = "VSRCHAT_ALLOWED_GITHUB_IDS"
        value = var.allowed_github_ids
      }
      env {
        name  = "VSRCHAT_ALLOWED_GITHUB_LOGINS"
        value = var.allowed_github_logins
      }
    }
  }

  depends_on = [google_project_service.enabled]
}

# Single-user relay: it is still public (auth enforced in-app via GitHub token),
# so allow unauthenticated network access; the app rejects non-allowlisted ids.
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.relay.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
