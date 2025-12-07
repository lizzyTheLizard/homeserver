resource "scaleway_iam_application" "homeserver" {
  name = "Homeserver Backend Application"
}

resource "scaleway_iam_api_key" "homeserver" {
  application_id = scaleway_iam_application.homeserver.id
  description    = "API key for the backend to access other services"
}

data "scaleway_account_project" "homeserver" {
  name = "Homeserver"
}

resource "scaleway_iam_policy" "homeserver_access" {
  name           = "Backend Service Access Policy"
  description    = "gives backend app access to other services project"
  application_id = scaleway_iam_application.homeserver.id
  rule {
    project_ids          = [data.scaleway_account_project.homeserver.id]
    permission_set_names = ["ServerlessSQLDatabaseReadWrite", "GenerativeApisModelAccess"]
  }
}