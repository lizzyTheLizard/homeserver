## ADDED Requirements

### Requirement: The zone authorises Brevo to send mail for the domain

The zone served by the name server SHALL authorise Brevo as a sender for the deployment's domain by extending the SPF record with Brevo while keeping the existing mail provider, and by publishing the Brevo DKIM records and the Brevo domain-verification record. The account-specific verification value SHALL come from the stack's environment and be substituted when the zone file is generated at start-up. The existing MX and DMARC records SHALL stay unchanged.

#### Scenario: SPF allows Brevo and the existing provider
- **WHEN** a receiver queries the TXT record of the domain's apex
- **THEN** the single SPF record includes both the existing mail provider and Brevo and still ends with `-all`

#### Scenario: DKIM and verification records are published
- **WHEN** Brevo or a receiver queries the Brevo DKIM names or the apex verification record
- **THEN** the name server answers with the Brevo records, the verification value being the one configured in the environment
