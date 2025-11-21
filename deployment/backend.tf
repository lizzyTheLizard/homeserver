resource "scaleway_iam_application" "backend" {
  name = "Backend Application"
}

resource "scaleway_iam_api_key" "backend" {
  application_id = scaleway_iam_application.backend.id
  description    = "API key for the backend to access the database"
}

data scaleway_account_project "homeserver" {
  name = "Homeserver"
}

resource scaleway_iam_policy "db_access" {
  name           = "my policy"
  description    = "gives app access to serverless database in project"
  application_id = scaleway_iam_application.backend.id
  rule {
    project_ids          = [data.scaleway_account_project.homeserver.id]
    permission_set_names = ["ServerlessSQLDatabaseReadWrite"]
  }
}

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
  environment_variables = {
    DB_CONNECTION_STRING = format("postgres://%s:%s@%s",
      scaleway_iam_application.backend.id,
      scaleway_iam_api_key.backend.secret_key,
      trimprefix(scaleway_sdb_sql_database.database.endpoint, "postgres://"),
    )
  }
  deploy = true
}

resource scaleway_sdb_sql_database "database" {
  name    = "homeserver-db"
  min_cpu = 0
  max_cpu = 1
}
