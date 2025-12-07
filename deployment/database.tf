resource "scaleway_sdb_sql_database" "database" {
  name    = "homeserver-db"
  min_cpu = 0
  max_cpu = 1
}
