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
    key: 'startpage', link: '/startpage/favorites', icon: 'startpage', name: 'StartPage',
    description: 'Browser start page with personal favorites',
    getLinks: () => [
      { text: 'Favorites', href: '/startpage/favorites' },
    ],
  },
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
