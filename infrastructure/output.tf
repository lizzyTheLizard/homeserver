
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

output "test_gutschi_site" {
    value = scaleway_container.test_gutschi_site.domain_name
    description = "test.gutschi.site"
}

output "www_gutschi_site" {
    value = scaleway_container.www_gutschi_site.domain_name
    description = "www.gutschi.site"
}
