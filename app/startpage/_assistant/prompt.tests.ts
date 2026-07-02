import { describe, expect, test, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import { join } from 'path'
import { getSystemMessage, getInitialMessage, getActionPrompt, getSkillTools } from './prompts'
import { tmpdir } from 'os'
import { ToolExecutionOptions } from 'ai'

describe('getSystemMessage', () => {
  test('should return the content of system.md', async () => {
    const result = await getSystemMessage()
    expect(result).toContain('You are the assistant for a personal homeserver dashboard.')
  })
})

describe('getInitialMessage', () => {
  test('should return the content of initial.md', async () => {
    const result = await getInitialMessage()
    expect(result).toContain('Good {timeofday}!')
  })
})

describe('getActionPrompt', () => {
  test('should return the content of action.md', async () => {
    const result = await getActionPrompt()
    expect(result).toContain('Based on the conversation so far')
  })
})

describe('getSkillTools', () => {
  test('should return an empty ToolSet when no skills exist', async () => {
    const result = await getSkillTools()
    expect(result).toEqual({})
  })
})

const SKILL_NAME = 'test-skill'
const SKILL_DESCRIPTION = 'A test skill'
const SKILL_CONTENT = `
    ---
    name: ${SKILL_NAME}
    description: ${SKILL_DESCRIPTION}
    ---
    # Test Skill
    This is a test skill.`

describe('skill loading from filesystem', () => {
  let tmpDir: string
  beforeEach(async () => {
    tmpDir = join(tmpdir(), Math.random().toString(36).substring(2, 15))
    await fs.mkdir(tmpDir, { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  test('empty dir', async () => {
    const tools = await getSkillTools(tmpDir)
    expect(tools).toEqual({})
  })

  test('should load a skill tool from a skill directory', async () => {
    const skillDir = join(tmpDir, SKILL_NAME)
    const skillFile = join(skillDir, 'SKILL.md')
    await fs.mkdir(skillDir, { recursive: true })
    await fs.writeFile(skillFile, SKILL_CONTENT)

    const tools = await getSkillTools(tmpDir)
    expect(tools[SKILL_NAME]).toBeDefined()
    expect(tools[SKILL_NAME].description).toBe(SKILL_DESCRIPTION)
    expect(tools[SKILL_NAME].inputSchema).toBeDefined()
  })

  test('should load skill.MD', async () => {
    const skillDir = join(tmpDir, SKILL_NAME)
    const skillFile = join(skillDir, 'SKILL.md')
    await fs.mkdir(skillDir, { recursive: true })
    await fs.writeFile(skillFile, SKILL_CONTENT)

    const tools = await getSkillTools(tmpDir)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const executeFkt: (a: unknown, b: ToolExecutionOptions) => Promise<string> = tools[SKILL_NAME].execute!
    const result: string = await executeFkt({}, { toolCallId: '123', messages: [] })
    expect(result).toContain(`These are the instructions for the skill test-skill. 
  The main file is SKILL.MD, it contains the description and instructions for the skill. 
  The other files in the skill directory are additional resources that may be needed to execute the skill. 
  The contents of the files are as follows:`)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const fileContent = JSON.parse(/(\{[\s\S]*?\})$/.exec(result)![0]) as Record<string, string>
    expect(fileContent['SKILL.md']).toBe(SKILL_CONTENT)
    expect(Object.keys(fileContent)).toHaveLength(1)
  })

  test('should include additional files when executing skill', async () => {
    const skillDir = join(tmpDir, SKILL_NAME)
    const skillFile = join(skillDir, 'SKILL.md')
    await fs.mkdir(skillDir, { recursive: true })
    await fs.writeFile(skillFile, SKILL_CONTENT)
    const extraFile = join(skillDir, 'template.md')
    await fs.writeFile(extraFile, '# Template\nThis is a template file.')
    const dataFile = join(skillDir, 'data.json')
    await fs.writeFile(dataFile, JSON.stringify({ key: 'value' }))

    const tools = await getSkillTools(tmpDir)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const executeFkt: (a: unknown, b: ToolExecutionOptions) => Promise<string> = tools[SKILL_NAME].execute!
    const result: string = await executeFkt({}, { toolCallId: '123', messages: [] })
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const fileContent = JSON.parse(/(\{[\s\S]*?\})$/.exec(result)![0]) as Record<string, string>
    expect(fileContent['SKILL.md']).toBe(SKILL_CONTENT)
    expect(fileContent['template.md']).toBe('# Template\nThis is a template file.')
    expect(fileContent['data.json']).toBe(JSON.stringify({ key: 'value' }))
    expect(Object.keys(fileContent)).toHaveLength(3)
  })
})
