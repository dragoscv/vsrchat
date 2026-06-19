output "relay_url" {
  description = "Public HTTPS URL of the relay service."
  value       = google_cloud_run_v2_service.relay.uri
}

output "relay_ws_url" {
  description = "WebSocket URL to put in the extension and PWA config."
  value       = replace("${google_cloud_run_v2_service.relay.uri}/ws", "https://", "wss://")
}

output "artifact_registry" {
  description = "Docker repo for pushing images."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/vsrchat"
}
