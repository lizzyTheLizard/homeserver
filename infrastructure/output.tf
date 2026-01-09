
output "OPENAI_API_KEY" {
  value = scaleway_iam_api_key.gutschi_site.secret_key
  sensitive = true
}

    
output "DB_CONNECTION_STRING" {
  value = format("postgres://%s:%s@%s",
    scaleway_iam_application.gutschi_site.id,
    scaleway_iam_api_key.gutschi_site.secret_key,
    trimprefix(scaleway_sdb_sql_database.test_gutschi_site.endpoint, "postgres://"),
  )
  sensitive = true
}

output "docker_image_name" {
  value = format("rg.fr-par.scw.cloud/%s/www_gutschi_site",
    scaleway_container_namespace.gutschi_site.registry_endpoint 
  )
  description = "Docker Image Name"
}

output "container_namespace_id" {
  value = scaleway_container_namespace.gutschi_site.id
  description = "Container Namespace ID"
}

output "test-container_id" {
  value = scaleway_container.test_gutschi_site.id
  description = "Test Container ID"
}

/* TODO: create www.gutschi.site container
output "www-container_id" {
  value = scaleway_container.www_gutschi_site.id
  description = "WWW Container ID"
}
*/

output "test_gutschi_site" {
    value = scaleway_container.test_gutschi_site.domain_name
    description = "test.gutschi.site"
}

/* TODO: create www.gutschi.site container
output "www_gutschi_site" {
    value = scaleway_container.www_gutschi_site.domain_name
    description = "www.gutschi.site"
}
*/
