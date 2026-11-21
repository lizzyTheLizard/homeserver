import { describe, expect, test, vi } from 'vitest'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('@/app/shared/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

import { getTools } from './tools'
import { SKILLS_DIR } from '../_tools/skills-tools'

const user = { name: 'A', email: 'a@test.com', applications: ['startpage'] }

describe('getTools', () => {
  test('registers a skill tool for every skill directory', async () => {
    const tools = await getTools(user)
    const skills = readdirSync(SKILLS_DIR, { withFileTypes: true }).filter(d => d.isDirectory())
    expect(skills.length).toBeGreaterThan(0)
    expect(Object.keys(tools).filter(n => n.startsWith('load_skill_'))).toHaveLength(skills.length)
  })

  test('registers every tools file', async () => {
    const files = readdirSync(join(import.meta.dirname, '..', '_tools')).filter(f => f.endsWith('-tools.ts'))
    const registry = (await import('node:fs')).readFileSync(join(import.meta.dirname, 'tools.ts'), 'utf-8')
    for (const file of files) expect(registry).toContain(`../_tools/${file.replace(/\.ts$/, '')}`)
  })
})
