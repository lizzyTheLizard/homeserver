export interface Application {
  key: string
  icon: string
  name: string
  link: string
  description: string
  links: { text: string, href: string }[]
}

export const applications: Application[] = [
  {
    key: 'app', link: '/cash', icon: 'cash', name: 'Cash',
    description: 'Double bookkeeping application for privates',
    links: [
      { text: 'Home', href: '/coeditor/' },
    ],
  },
  {
    key: 'admin', link: '/admin/dashboard', icon: 'admin', name: 'Admin',
    description: 'General server admin',
    links: [
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
    links: [
      { text: 'Editor', href: '/coeditor/editor' },
      { text: 'Settings', href: '/coeditor/settings' },
      { text: 'History', href: '/coeditor/history' },
    ],
  },
]
