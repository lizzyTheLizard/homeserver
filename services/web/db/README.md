# Database migrations

Migrations are plain SQL files run in lexical filename order at server start (see [app/shared/_external/db/migrate.ts](app/shared/_external/db/migrate.ts)). Use a numeric prefix and an underscore-separated description, e.g. `070_schema_fixes.sql`.

## Rules

- **Append-only.** Once a migration has been applied to any environment its contents are hashed and stored in the `migrations` table. Editing the file causes startup to abort. Add a new migration to make further changes.
- **Skip-by-prefix.** Files starting with `XXX_` are run on every startup but *not* recorded. Use this to iterate locally; rename to a numeric prefix before merging.
- **Order matters.** Every migration must run cleanly after every previous migration. The runner aborts if a previously-applied migration has been removed or modified, or if migrations run out of order.
- **One migration, one logical change.** Easier to roll back mentally and easier to review.

## SQL format

The runner uses a tokeniser-aware splitter (see [app/shared/_external/db/splitSql.ts](app/shared/_external/db/splitSql.ts)) that handles single/double quoted strings, dollar-quoted blocks, and `--`/`/* */` comments. You can therefore include `;` inside string literals or PL/pgSQL bodies safely.

## owner_email

Per-row ownership is keyed on the user's email (`owner_email TEXT NOT NULL`). There is no users table; every domain table denormalises the email so that `WHERE owner_email = $1` is always the access-control predicate.
