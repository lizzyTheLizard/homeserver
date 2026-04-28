# Infrastructure

Terraform configuration for the Scaleway-hosted production and test environments. State is kept in **Terraform Cloud** (`gutschi-site` organisation, `homesever-cicd` workspace).

## Resources provisioned

- One Scaleway IAM application + API key, scoped to `ServerlessSQLDatabaseReadWrite` and `GenerativeApisModelAccess`.
- Two Serverless SQL databases (`www-gutschi-site`, `test-gutschi-site`).
- One container namespace plus two containers (`www`, `test`) running the Next.js standalone image.
- Two custom domains (`www.gutschi.site`, `test.gutschi.site`).

## Variables

| Variable           | Source                       |
|--------------------|------------------------------|
| `access_key`       | Scaleway IAM (sensitive)     |
| `secret_key`       | Scaleway IAM (sensitive)     |
| `organization_id`  | Scaleway                     |
| `project_id`       | Scaleway                     |
| `client_secret`    | OIDC client secret           |
| `session_password` | iron-session encryption key  |
| `admin_email`      | Email of the admin user      |

All sensitive variables live in Terraform Cloud workspace settings. The CI job `infrastructure` runs `plan_only`; any drift fails CI and must be applied manually.

## CI ↔ runtime mapping

The deploy job in [.github/workflows/homeserver.yml](.github/workflows/homeserver.yml) chooses the target container by branch:

- `main` → production container (`www`)
- everything else → test container (`test`)

Terraform is then run in `plan_only` mode to check for drift against the existing infrastructure. If the plan detects changes, the build fails. In that case, apply the infrastructure changes manually before pushing:

```bash
terraform apply
```
