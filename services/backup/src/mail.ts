import type { AppConfig } from './config'

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'

// Sends a plain-text mail through Brevo. Problems are logged and never thrown, so a mail outage cannot change the outcome of a backup
export async function sendMail(config: AppConfig, subject: string, text: string): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    console.info(`Development: not sending mail '${subject}' to ${config.mailTo}`)
    return
  }
  try {
    const response = await fetch(BREVO_URL, {
      method: 'POST',
      headers: { 'api-key': config.brevoApiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ sender: { email: config.mailFrom }, to: [{ email: config.mailTo }], subject, textContent: text }),
    })
    if (!response.ok) throw new Error(`Brevo responded ${response.status}: ${await response.text()}`)
    console.info(`Mail '${subject}' sent to ${config.mailTo}`)
  } catch (error) {
    console.error('Could not send mail', error)
  }
}
