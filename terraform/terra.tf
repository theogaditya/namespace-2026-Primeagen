
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "7.10.0"
    }
  }
}
variable "project" {
  type = string
  default = "orbital-builder-454706-h5"
}
provider "google" {
  project = var.project
  region  = "us-central1"
  zone    = "us-central1-a"
}

resource "google_container_cluster" "autopilot" {

  name     = "autopilot-cluster-1"
  location = "us-central1"
  deletion_protection = false
  enable_autopilot = true

  release_channel {
    channel = "REGULAR"
  }

  network    = "projects/orbital-builder-454706-h5/global/networks/default"
  subnetwork = "projects/orbital-builder-454706-h5/regions/us-central1/subnetworks/default"

  ip_allocation_policy {
    cluster_ipv4_cidr_block = "/17"
  }
  binary_authorization {
    evaluation_mode = "DISABLED"
  }
}

output "cluster_name" {
  value = google_container_cluster.autopilot.name
}

output "gke_endpoint" {
  value = google_container_cluster.autopilot.endpoint
}

output "connect_to_cluster" {
  value = "gcloud container clusters get-credentials ${google_container_cluster.autopilot.name} --region ${google_container_cluster.autopilot.location} --project ${var.project}"
}