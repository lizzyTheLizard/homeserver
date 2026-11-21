import type { ToolSet } from 'ai'
import type { UserSession } from './session'
import { readdir } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import { join } from 'path'
import { pathToFileURL } from 'node:url'
import { logger } from './logger'
import { z } from 'zod'

// oxlint-disable-next-line eslint/no-underscore-dangle
declare const __dirname: string
const TOOLS_DIR = join(__dirname, 'tools')
const toolModuleSchema = z.object({
  default: z.custom<(user: UserSession) => ToolSet>(value => typeof value === 'function'),
})

export async function getTools(user: UserSession): Promise<ToolSet> {
  const files = await readdir(TOOLS_DIR, { withFileTypes: true })
  const toolFiles = files.filter(isToolFile)
  const allTools: ToolSet = {}
  for (const file of toolFiles) {
    const filePath = join(TOOLS_DIR, file.name)
    const importPath = file.name.endsWith('.js') ? filePath : pathToFileURL(filePath).href
    const mod: unknown = await import(importPath)
    const { default: createTools } = toolModuleSchema.parse(mod)
    Object.assign(allTools, createTools(user))
  }
  logger.debug(`Loaded ${Object.keys(allTools).length.toString()} tools from ${TOOLS_DIR}`)
  return allTools
}

function isToolFile(f: Dirent): boolean {
  if (!f.isFile()) return false // Skip directories and symlinks
  if (!/-tools\.(?:ts|js)$/.test(f.name)) return false // Only tool implementation files
  return true
}
