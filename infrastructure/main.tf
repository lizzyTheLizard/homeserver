resource "scaleway_iam_application" "gutschi_site" {
  name = "Gutschi.Site Backend Application"
}

resource "scaleway_iam_api_key" "gutschi_site" {
  application_id = scaleway_iam_application.gutschi_site.id
  description    = "API key for the backend to access other services"
}

data "scaleway_account_project" "gutschi_site" {
  name = "Homeserver"
}

resource "scaleway_iam_policy" "gutschi_site" {
  name           = "Gutschi.site Backend Service Access Policy"
  description    = "gives backend app access to other services project"
  application_id = scaleway_iam_application.gutschi_site.id
  rule {
    project_ids          = [data.scaleway_account_project.gutschi_site.id]
    permission_set_names = ["ServerlessSQLDatabaseReadWrite", "GenerativeApisModelAccess"]
  }
}

resource "scaleway_sdb_sql_database" "www_gutschi_site" {
  name            = "www-gutschi-site"
  min_cpu         = 0
  max_cpu         = 1
}

resource "scaleway_sdb_sql_database" "test_gutschi_site" {
  name            = "test-gutschi-site"
  min_cpu         = 0
  max_cpu         = 1
}

resource "scaleway_container_namespace" "gutschi_site" {
  name            = "gutschi-site"
  description     = "Gutschi.site Homeserver"
}

resource "scaleway_container" "www_gutschi_site" {
  name            = "www-gutschi-site"
  description     = "React-Application incl. backend"
  namespace_id    = scaleway_container_namespace.gutschi_site.id
  registry_image  = "${scaleway_container_namespace.gutschi_site.registry_endpoint}/www_gutschi_site:latest"
  port            = 3000
  min_scale       = 0
  max_scale       = 1
  privacy         = "public"
  cpu_limit       = 100
  memory_limit    = 128
  deploy          = true
  environment_variables = {
    APP_URL="https://www.gutschi.site",
    CLIENT_ID="f79682fe-0761-4361-aa2e-317957284c3a",
    ISSUER="https://login.microsoftonline.com/7bd72b43-52f6-4dc6-a856-5704e0f925bd/v2.0",
    COOKIE_NAME="session",
    ADMIN_EMAIL=var.admin_email,
    WEATHER_API_LOCATION="46.9471,7.4441",
    WEATHER_DETAIL_URL="https://www.srf.ch/meteo/wetter/Bern/46.9471,7.4441"
  }
  secret_environment_variables = {
    CLIENT_SECRET=var.client_secret,
    SESSION_PASSWORD=var.session_password,
    DB_CONNECTION_STRING = format("postgres://%s:%s@%s?%s",
      scaleway_iam_application.gutschi_site.id,
      scaleway_iam_api_key.gutschi_site.secret_key,
      split("?" , trimprefix(scaleway_sdb_sql_database.www_gutschi_site.endpoint, "postgres://"))[0],
      "sslmode=verify-full",
    ),
    OPENAI_API_KEY = scaleway_iam_api_key.gutschi_site.secret_key
  }
}

resource "scaleway_container" "test_gutschi_site" {
  name            = "test-gutschi-site"
  description     = "React-Application incl. backend (TEST)"
  namespace_id    = scaleway_container_namespace.gutschi_site.id
  registry_image  = "${scaleway_container_namespace.gutschi_site.registry_endpoint}/www_gutschi_site:test"
  port            = 3000
  min_scale       = 0
  max_scale       = 1
  privacy         = "public"
  cpu_limit       = 100
  memory_limit    = 128
  deploy          = false
  environment_variables = {
    APP_URL="https://test.gutschi.site",
    CLIENT_ID="f79682fe-0761-4361-aa2e-317957284c3a",
    ISSUER="https://login.microsoftonline.com/7bd72b43-52f6-4dc6-a856-5704e0f925bd/v2.0",
    COOKIE_NAME="session",
    ADMIN_EMAIL=var.admin_email,
    WEATHER_API_LOCATION="46.9471,7.4441",
    WEATHER_DETAIL_URL="https://www.srf.ch/meteo/wetter/Bern/46.9471,7.4441"
  }
  secret_environment_variables = {
    CLIENT_SECRET=var.client_secret,
    SESSION_PASSWORD=var.session_password,
    DB_CONNECTION_STRING = format("postgres://%s:%s@%s?%s",
      scaleway_iam_application.gutschi_site.id,
      scaleway_iam_api_key.gutschi_site.secret_key,
      split("?" , trimprefix(scaleway_sdb_sql_database.test_gutschi_site.endpoint, "postgres://"))[0],
      "sslmode=verify-full",
    ),
    OPENAI_API_KEY = scaleway_iam_api_key.gutschi_site.secret_key
  }
}

resource scaleway_container_domain "www_gutschi_site" {
  container_id = scaleway_container.www_gutschi_site.id
  hostname     = "www.gutschi.site"
}

resource scaleway_container_domain "test_gutschi_site" {
  container_id = scaleway_container.test_gutschi_site.id
  hostname     = "test.gutschi.site"
}