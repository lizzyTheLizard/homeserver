import { Metadata } from 'openai/resources/index.js'

export const metadata: Metadata = {
  title: 'Gutschi.site - Auth Error',
}

export default function Page() {
  return (
    <main>
      <h1>Authentication failed</h1>
      <p>The authentication process failed. Please try again.</p>
    </main>
  )
}
