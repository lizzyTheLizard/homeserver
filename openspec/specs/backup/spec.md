# backup Specification

## Purpose
Defines the backup service: the nightly full dump of the production database, its upload to a personal OneDrive, and how the service is built, type-checked and published like the other services.

## Requirements

### Requirement: The production database is backed up nightly

A backup service SHALL take a full custom-format dump of the production database on the schedule in `BACKUP_SCHEDULE` (default `0 3 * * *`), SHALL store it in the local backup directory, and SHALL delete local dumps older than the number of days in `RETENTION_DAYS` (31 in the stack's configuration) after a successful upload. It SHALL fail loudly at start-up when a required setting is missing.

#### Scenario: Nightly dump is written
- **WHEN** the configured backup schedule fires
- **THEN** a full dump of the production database is written to the local backup directory

#### Scenario: A backup can be taken by hand
- **WHEN** the service is started with `--now` while the scheduled service is running
- **THEN** one additional backup runs immediately, the process exits with a failure code if it failed, and the schedule of the running service is not changed

#### Scenario: Old dumps are deleted
- **WHEN** a dump was uploaded successfully and a local dump is older than the configured retention
- **THEN** that local dump is deleted

#### Scenario: A failed dump keeps nothing partial
- **WHEN** the dump fails
- **THEN** the partial file is removed and the failure is reported

#### Scenario: Missing configuration stops the service
- **WHEN** a required backup setting is missing
- **THEN** the service fails at start-up instead of scheduling a backup that cannot run

#### Scenario: A backup directory that cannot be written stops the service
- **WHEN** the service cannot write to the backup directory
- **THEN** it fails at start-up and names the directory

#### Scenario: An invalid schedule stops the service
- **WHEN** `BACKUP_SCHEDULE` is not a valid five-field cron expression
- **THEN** the service fails at start-up and names the invalid field

#### Scenario: A failed run does not stop the schedule
- **WHEN** a scheduled backup fails
- **THEN** the failure is reported and the service waits for the next scheduled time

### Requirement: Backups are uploaded to OneDrive

The backup service SHALL upload each dump to a personal OneDrive through the Microsoft Graph API using a delegated refresh token, SHALL target the configured folder (default `Homeserver`) and replace an existing file of the same name, and SHALL keep the local copy when the upload fails.

#### Scenario: Dump is uploaded
- **WHEN** a dump completes and OneDrive is reachable
- **THEN** the dump is uploaded to the configured OneDrive folder, replacing any file of the same name

#### Scenario: Upload failure keeps the local copy
- **WHEN** the upload fails
- **THEN** the local dump is kept and the failure is reported

### Requirement: The backup is built, checked and published like the other services

The backup SHALL be its own package in the workspace under `services/backup`, SHALL be type-checked and linted with the shared configuration, and its image SHALL be published to GitHub Container Registry as `ghcr.io/<owner>/homeserver-backup:latest` from the service's own folder.

#### Scenario: The backup is linted with the other packages
- **WHEN** the repository is linted
- **THEN** the backup's scripts and tests are checked with the shared lint and format configuration

#### Scenario: The image is published
- **WHEN** the "CI" pipeline runs on main
- **THEN** the backup image is built from the backup's folder and published with the other images

### Requirement: The outcome of every backup is reported by email

The backup service SHALL send an email through Brevo to the configured recipient when a backup run fails, naming the failing step and the error, and SHALL send an email when a run succeeds, naming the dump and its size, unless the success mail is switched off by configuration. The recipient defaults to `matthias.graf@gutschi.site` and is configurable, as are the Brevo API key, the sender address and the success-mail switch (on by default), all through environment variables. A run that fails because of the OneDrive upload SHALL also be reported as a failure.

#### Scenario: A failed backup sends a failure mail
- **WHEN** a backup run fails (dump or upload)
- **THEN** a failure mail with the error is sent to the configured recipient

#### Scenario: A successful backup sends a success mail
- **WHEN** a backup run succeeds and the success mail is not switched off
- **THEN** a success mail naming the dump and its size is sent to the configured recipient

#### Scenario: The success mail can be switched off
- **WHEN** the success mail is switched off by configuration and a backup run succeeds
- **THEN** no mail is sent, while a failing run still sends its failure mail

#### Scenario: A mail that cannot be sent does not affect the backup
- **WHEN** Brevo rejects a mail or is unreachable
- **THEN** the problem is logged, the backup keeps its own outcome and the schedule continues

#### Scenario: Missing mail configuration stops the service
- **WHEN** the Brevo API key or the sender address is missing outside development
- **THEN** the service fails at start-up and names the missing setting

#### Scenario: Development never sends mail
- **WHEN** the service runs in development
- **THEN** no mail is sent to Brevo
