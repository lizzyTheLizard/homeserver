resource "scaleway_object_bucket" "frontend" {  
  name       = "gutschi-site-fe-storage"
}

resource "scaleway_object_bucket_acl" "frontend_acl" {
  bucket = scaleway_object_bucket.frontend.id
  acl    = "public-read"
}

resource "scaleway_object" "frontend_upload" {
  for_each = fileset("${path.module}/dist/frontend/", "**/*")
  bucket   = scaleway_object_bucket.frontend.name
  key      = each.key
  file     = "${path.module}/dist/frontend/${each.value}"
  hash     = filesha256("${path.module}/dist/frontend/${each.value}")
  content_type = lookup({
    html = "text/html"
    css  = "text/css"
    js   = "application/javascript"
    png  = "image/png"
    jpg  = "image/jpeg"
    jpeg = "image/jpeg"
    svg  = "image/svg+xml"
    ico  = "image/x-icon"
    json = "application/json"
  }, split(".", each.value)[length(split(".", each.value)) - 1], "application/octet-stream")
  visibility = "public-read"
}

resource "scaleway_object_bucket_website_configuration" "frontend_website" {
  bucket = scaleway_object_bucket.frontend.name
  index_document {
    suffix = "index.html"
  }
  error_document {
    key = "index.html"
  }
}