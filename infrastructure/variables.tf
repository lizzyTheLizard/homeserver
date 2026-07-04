variable "organization_id" {
  type = string
  sensitive = false
}
variable "project_id" {
  type = string
  sensitive = false
}
variable "log_level" {
  type = string
  sensitive = false
  default = "info"
}
variable "admin_email" {
  type = string
  sensitive = false
}
variable "client_id" {
  type = string
  sensitive = false
}
variable "issuer" {
  type = string
  sensitive = false
}
variable "access_key" {
  type = string
  sensitive = true
}
variable "secret_key" {
  type = string
  sensitive = true
}
variable "client_secret" {
  type = string
  sensitive = true
}
variable "session_password" {
  type = string
  sensitive = true
}
variable "ai_api_key" {
  type = string
  sensitive = true
}

terraform {
  cloud { 
    organization = "gutschi-site" 
    workspaces { 
      name = "homesever-cicd" 
    } 
  }
  required_providers {
    scaleway = {
      source = "scaleway/scaleway"
    }
  }
}

provider "scaleway" {
  access_key      = var.access_key
  secret_key      = var.secret_key
  organization_id = var.organization_id
  project_id      = var.project_id
  zone   = "fr-par-1"
  region = "fr-par"
}