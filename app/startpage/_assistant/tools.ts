import { ToolSet } from 'ai'
import { UserSession } from '@/app/shared/auth/auth'
import { readdir } from 'node:fs/promises'
import { Dirent } from 'node:fs'
import { join } from 'path'
import { pathToFileURL } from 'node:url'
import { logger } from '@/app/shared/logger'

declare const __dirname: string
const TOOLS_DIR = join(__dirname, 'tools')

export async function getTools(user: UserSession): Promise<ToolSet> {
  const files = await readdir(TOOLS_DIR, { withFileTypes: true })
  const toolFiles = files.filter(isToolFile)
  const allTools: ToolSet = {}
  for (const file of toolFiles) {
    const filePath = join(TOOLS_DIR, file.name)
    const importPath = file.name.endsWith('.js') ? filePath : pathToFileURL(filePath).href
    const mod = await import(importPath) as { default: (user: UserSession) => ToolSet }
    Object.assign(allTools, mod.default(user))
  }
  logger.debug(`Loaded ${Object.keys(allTools).length.toString()} tools from ${TOOLS_DIR}`)
  return allTools
}

function isToolFile(f: Dirent): boolean {
  if (!f.isFile()) return false // Skip directories and symlinks
  if (!/\.(ts|js)$/.test(f.name)) return false // Only TypeScript and JavaScript files
  if (/\.tests\.(ts|js)$/.test(f.name)) return false // Skip test files
  return true
}
