output "backend_domain" {
    value = scaleway_function.backend.domain_name
    description = "The function domain"
}

output "frontend_domain" {
    value = scaleway_object_bucket.frontend.endpoint
    description = "The frontend domain"
}


