variable "access_key" {
  type = string
  sensitive = true
}
variable "secret_key" {
  type = string
  sensitive = true
}
variable "organization_id" {
  type = string
  sensitive = true
}
variable "project_id" {
  type = string
  sensitive = true
}

terraform {
  cloud { 
    organization = "gutschi-site" 
    workspaces { 
      name = "homesever" 
    } 
  }
  required_providers {
    scaleway = {
      source = "scaleway/scaleway"
    }
  }
  required_version = ">= 0.13"
}

provider "scaleway" {
  access_key      = var.access_key
  secret_key      = var.secret_key
  organization_id = var.organization_id
  project_id      = var.project_id
  zone   = "fr-par-1"
  region = "fr-par"
}

resource "scaleway_object_bucket" "frontend" {  
  name       = "gutschi-site-fe-storage"
}

resource "scaleway_object_bucket_acl" "main" {
  bucket = scaleway_object_bucket.frontend.id
  acl    = "public-read"
}

resource "scaleway_object" "frontend_upload" {
  for_each = fileset("${path.module}/frontend/build/client", "**/*")
  bucket   = scaleway_object_bucket.frontend.name
  key      = each.key
  file   = "${path.module}/frontend/build/client/${each.value}"
  visibility = "public-read"
}

resource "scaleway_object_bucket_website_configuration" "frontend" {
  bucket = scaleway_object_bucket.frontend.name
  index_document {
    suffix = "index.html"
  }
  error_document {
    key = "error.html"
  }
}
