output "backend_domain" {
    value = scaleway_function.backend.domain_name
    description = "The function domain"
}

output "frontend_domain" {
    value = scaleway_object_bucket.frontend.endpoint
    description = "The frontend domain"
}
    
output "database_connection_string" {
  // Output as an example, you can give this string to your application
  value = format("postgres://%s:%s@%s",
    scaleway_iam_application.homeserver.id,
    scaleway_iam_api_key.homeserver.secret_key,
    trimprefix(scaleway_sdb_sql_database.database.endpoint, "postgres://"),
  )
  sensitive = true
}
