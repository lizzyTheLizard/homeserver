import { findProjectsByOwner } from '../cash/_data/Project'
import { config } from '../shared/config'
import { nontransactional } from '../shared/db'

export interface Application {
  key: string
  icon: string
  name: string
  link: string
  description: string
  getLinks: (path: string) => { text: string, href: string }[]
}

export const applications: Application[] = [
  {
    key: 'cash', link: '/cash/', icon: 'cash', name: 'Cash',
    description: 'Double bookkeeping application for privates',
    getLinks: (path: string) => {
      if (path.startsWith('/cash/projects/')) return []
      if (!path.startsWith('/cash/')) return []
      const split = path.split('/')
      if (split.length < 4) return []
      const projectId = split[2]
      const date = split[3]
      return [
        { text: 'Journal', href: `/cash/${projectId}/${date}/journal` },
        { text: 'Accounts', href: `/cash/${projectId}/${date}/accounts` },
        { text: 'Reports', href: `/cash/${projectId}/${date}/reports` },
        { text: 'Closing', href: `/cash/${projectId}/${date}/closing` },
      ]
    },
  },
  {
    key: 'admin', link: '/admin/dashboard', icon: 'admin', name: 'Admin',
    description: 'General server admin',
    getLinks: () => [
      { text: 'Dashboard', href: '/admin/dashboard' },
      { text: 'Metrics', href: '/admin/metrics' },
      { text: 'Config', href: '/admin/config' },
      { text: 'Logs', href: '/admin/logs' },
      { text: 'Cash', href: '/admin/cash' },
    ],
  },
  {
    key: 'coeditor', link: '/coeditor/editor', icon: 'coeditor', name: 'CoEditor',
    description: 'Customizable AI-driven Editor',
    getLinks: () => [
      { text: 'Editor', href: '/coeditor/editor' },
      { text: 'Settings', href: '/coeditor/settings' },
      { text: 'History', href: '/coeditor/history' },
    ],
  },
]

export async function getApplicationsForUser(sub: string, email: string): Promise<string[]> {
  // Everyone can access coeditor
  const result = ['coeditor']
  // Only the admin can access admin pages
  if (email === config.ADMIN_EMAIL) result.push('admin')
  // Only if you have a project you can access cash
  const projects = await nontransactional(c => findProjectsByOwner(c, sub))
  if (projects.length > 0) {
    result.push('cash')
  }
  return result
}
