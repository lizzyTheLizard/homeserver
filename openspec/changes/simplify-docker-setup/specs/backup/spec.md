# Spec Delta

## Purpose

Defines the backup service: the nightly full dump of the production database, its upload to a personal OneDrive, the restore of a dump into the development or production database, and how the service is built, tested and published like the other services.

## ADDED Requirements

### Requirement: The production database is backed up nightly

A backup service SHALL take a full custom-format dump of the production database on the schedule in `BACKUP_SCHEDULE` (default `0 3 * * *`), SHALL store it in the local backup directory, and SHALL delete local dumps older than `RETENTION_DAYS` (default 31) after a successful upload. It SHALL fail loudly at start-up when a required setting is missing.

#### Scenario: Nightly dump is written
- **WHEN** the configured backup schedule fires
- **THEN** a full dump of the production database is written to the local backup directory

#### Scenario: Old dumps are deleted
- **WHEN** a dump was uploaded successfully and a local dump is older than the configured retention
- **THEN** that local dump is deleted

#### Scenario: A failed dump keeps nothing partial
- **WHEN** the dump fails
- **THEN** the partial file is removed and the failure is reported

#### Scenario: Missing configuration stops the service
- **WHEN** a required backup setting is missing
- **THEN** the service fails at start-up instead of scheduling a backup that cannot run

### Requirement: Backups are uploaded to OneDrive

The backup service SHALL upload each dump to a personal OneDrive through the Microsoft Graph API using a delegated refresh token, SHALL target the configured folder (default `Homeserver`) and replace an existing file of the same name, and SHALL keep the local copy when the upload fails.

#### Scenario: Dump is uploaded
- **WHEN** a dump completes and OneDrive is reachable
- **THEN** the dump is uploaded to the configured OneDrive folder, replacing any file of the same name

#### Scenario: Upload failure keeps the local copy
- **WHEN** the upload fails
- **THEN** the local dump is kept and the failure is reported

### Requirement: A backup can be restored into the development or production database

The backup service SHALL be able to replace a target database from a dump file, resolving a bare file name against the local backup directory, refusing to restore when the resolved development connection is the production connection, requiring the confirmation `restore prod` before overwriting the production database, and reporting afterwards that the target application has to be restarted so migrations run.

#### Scenario: Restoring into the development database
- **WHEN** a dump is restored with the development target
- **THEN** the development database's public schema is replaced by the dump

#### Scenario: Restoring into production requires confirmation
- **WHEN** a dump is restored with the production target without the explicit confirmation
- **THEN** the restore does not run

#### Scenario: Restoring into the wrong target is refused
- **WHEN** the development connection resolves to the production connection
- **THEN** the restore is refused

#### Scenario: Restore reports the required restart
- **WHEN** a restore completes
- **THEN** the service reports that the target application must be restarted

### Requirement: The backup is built, checked and published like the other services

The backup SHALL be its own package in the workspace under `services/backup`, SHALL be linted with the shared configuration and SHALL have unit tests for the decisions of the restore, and its image SHALL be published to GitHub Container Registry as `ghcr.io/<owner>/homeserver-backup:latest` from the service's own folder.

#### Scenario: The backup is linted with the other packages
- **WHEN** the repository is linted
- **THEN** the backup's scripts and tests are checked with the shared lint and format configuration

#### Scenario: The restore decisions are tested
- **WHEN** the backup's tests run
- **THEN** they verify argument handling, connection resolution, the refusal to restore into the production connection from a non-production target and the resolution of backup file names

#### Scenario: The image is published
- **WHEN** the "CI" pipeline runs on main
- **THEN** the backup image is built from the backup's folder and published with the other images
