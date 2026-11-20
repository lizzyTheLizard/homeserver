export interface Application {
  key: string
  icon: string
  name: string
  link: string
  description: string
  getLinks(path: string): { text: string, href: string, hideMobile?: boolean }[]
}

export const applications: Application[] = [
  {
    description: 'Browser start page with personal favorites', getLinks: () => [
      { href: '/startpage/favorites', text: 'Favorites' },
      { href: '/startpage/whatsapp', text: 'WhatsApp' },
      { href: '/startpage/microsoft', text: 'Microsoft' },
    ], icon: 'startpage', key: 'startpage', link: '/startpage/favorites', name: 'StartPage',
  },
  {
    description: 'Double bookkeeping application for privates', getLinks: (path: string) => {
      if (path.startsWith('/cash/projects/')) {return []}
      if (!path.startsWith('/cash/')) {return []}
      const split = path.split('/')
      if (split.length < 4) {return []}
      const projectId = split[2],
       date = split[3]
      return [
        { href: `/cash/${projectId}/${date}/journal`, text: 'Journal' },
        { href: `/cash/${projectId}/${date}/accounts`, text: 'Accounts' },
        { href: `/cash/${projectId}/${date}/reports`, text: 'Reports' },
        { hideMobile: true, href: `/cash/${projectId}/${date}/closing`, text: 'Closing' },
      ]
    }, icon: 'cash', key: 'cash', link: '/cash/', name: 'Cash',
  },
  {
    description: 'General server admin', getLinks: () => [
      { href: '/admin/dashboard', text: 'Dashboard' },
      { href: '/admin/metrics', text: 'Metrics' },
      { href: '/admin/config', text: 'Config' },
      { href: '/admin/cash', text: 'Cash' },
    ], icon: 'admin', key: 'admin', link: '/admin/dashboard', name: 'Admin',
  },
  {
    description: 'Customizable AI-driven Editor', getLinks: () => [
      { href: '/coeditor/editor', text: 'Editor' },
      { href: '/coeditor/settings', text: 'Settings' },
      { href: '/coeditor/history', text: 'History' },
    ], icon: 'coeditor', key: 'coeditor', link: '/coeditor/editor', name: 'CoEditor',
  },
]
