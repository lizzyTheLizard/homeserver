import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  route('cash/', './cash/ProjectPage.tsx'),
  route('callback.html', './general/auth/AuthPage.tsx', { id: 'auth-callback' }),
  route('silent-callback.html', './general/auth/AuthPage.tsx', { id: 'silent-auth-callback' }),
  route('coeditor/', './coeditor/EditorPage.tsx'),
  route('admin/', './admin/DashboardPage.tsx'),
  index('general/MainPage.tsx'),
] satisfies RouteConfig
