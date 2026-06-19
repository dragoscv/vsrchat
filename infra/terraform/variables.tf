variable "project_id" {
  description = "GCP project id."
  type        = string
  default     = "vsrchat"
}

variable "region" {
  description = "GCP region for Cloud Run + Artifact Registry."
  type        = string
  default     = "europe-west1"
}

variable "relay_image" {
  description = "Full image ref for the relay (Artifact Registry)."
  type        = string
  default     = ""
}

variable "allowed_github_ids" {
  description = "Comma-separated GitHub user ids allowed to use the relay."
  type        = string
  default     = ""
}

variable "allowed_github_logins" {
  description = "Comma-separated GitHub logins allowed to use the relay."
  type        = string
  default     = ""
}

variable "min_instances" {
  description = "Minimum Cloud Run instances (0 = scale to zero)."
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum Cloud Run instances."
  type        = number
  default     = 2
}
