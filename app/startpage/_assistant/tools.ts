import { ToolSet } from 'ai'
import { UserSession } from '@/app/shared/auth/auth'
import { readdir } from 'node:fs/promises'
import { Dirent } from 'node:fs'
import { join } from 'path'

const TOOLS_DIR = join(process.cwd(), 'app', 'startpage', '_assistant', 'tools')

export default async function getTools(user: UserSession): Promise<ToolSet> {
  const files = await readdir(TOOLS_DIR, { withFileTypes: true })
  const toolFiles = files.filter(isToolFile)
  const allTools: ToolSet = {}
  for (const file of toolFiles) {
    const mod = await import(`./tools/${file.name}`) as { default: (user: UserSession) => ToolSet }
    Object.assign(allTools, mod.default(user))
  }
  return allTools
}

function isToolFile(f: Dirent): boolean {
  if (!f.isFile()) return false // Skip directories and symlinks
  if (!/\.(ts|js)$/.test(f.name)) return false // Only TypeScript and JavaScript files
  if (/\.tests\.(ts|js)$/.test(f.name)) return false // Skip test files
  return true
}
