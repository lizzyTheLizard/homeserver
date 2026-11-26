## ADDED Requirements

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
