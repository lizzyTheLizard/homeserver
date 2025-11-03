import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  route('cash/', './cash/ProjectPage.tsx'),
  route('coeditor/', './coeditor/EditorPage.tsx'),
  route('admin/', './admin/DashboardPage.tsx'),
  index('general/MainPage.tsx'),
] satisfies RouteConfig
