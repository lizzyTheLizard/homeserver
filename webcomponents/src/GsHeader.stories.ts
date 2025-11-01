import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'

import './GsHeader'
import './GsHeaderLink'

interface Args {
  applicationName: string
  user: string
  portalAccess: boolean | undefined
  portalLink: string | undefined
  logoutLink: string | undefined
}

/**
 * The common header for all pages in the application
 */
const meta: Meta<Args> = {
  title: 'GsHeader',
  argTypes: {
    applicationName: { control: 'text', description: 'The name of the application' },
    user: { control: 'text', description: 'The name of the user' },
    portalAccess: { control: 'boolean', description: 'Whether the user has access to the portal' },
    portalLink: { action: 'portal', description: 'URL of the portal' },
    logoutLink: { action: 'logout', description: 'URL of the logout link' },
  },
  args: {
    applicationName: 'Homeserver',
    user: 'John Doe',
    portalAccess: true,
    portalLink: '#',
    logoutLink: '#',
  },
  render: (args: Args) => html`
    <gs-header  
      applicationName="${args.applicationName}"
      user="${args.user}"
      ?portalAccess="${args.portalAccess}"
      portalLink="${ifDefined(args.portalLink)}"
      logoutLink="${ifDefined(args.logoutLink)}"
    >
      <gs-header-link href="#">Dashboard</gs-header-link>
      <gs-header-link href="#">Settings</gs-header-link>
    </gs-header>
  `,
}
export default meta

export const Normal: StoryObj<Args> = {
}

export const NoPortalAccess: StoryObj<Args> = {
  args: {
    portalAccess: false,
  },
}
