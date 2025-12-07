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
  zip_hash  = filesha256("${path.module}/dist/backend/homeserver-backend.zip")
  secret_environment_variables = {
    DB_CONNECTION_STRING = format("postgres://%s:%s@%s",
      scaleway_iam_application.homeserver.id,
      scaleway_iam_api_key.homeserver.secret_key,
      trimprefix(scaleway_sdb_sql_database.database.endpoint, "postgres://"),
    ),
    OPENAI_API_KEY = scaleway_iam_api_key.homeserver.secret_key
  }
  environment_variables = {
    CORS_ALLOWED_ORIGIN="https://gutschi-site-fe-storage.s3-website.fr-par.scw.cloud"
  }
  deploy = true
}

resource "scaleway_function_domain" "backend" {
  function_id = scaleway_function.backend.id
  hostname    = "scaleway-backend.gutschi.site"
  depends_on = [ scaleway_function.backend ]
}

