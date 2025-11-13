
resource "scaleway_function_namespace" "main" {
  name        = "homeserver"
  description = "Homeserver function namespace"
}

resource "scaleway_function" "backend" {
  namespace_id = scaleway_function_namespace.main.id
  name        = "backend"
  description = "Backend function"
  runtime = "node22"
  handler = "build/handler.handler"
  privacy = "public"
  zip_file = "${path.module}/dist/backend/homeserver-backend.zip"
  environment_variables = {
  }
  deploy = true
}
