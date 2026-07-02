import { logger } from '@/app/shared/logger'
import { tool, ToolSet } from 'ai'
import { promises as fs } from 'fs'
import { join } from 'path'
import z from 'zod'

const ASSISTANT_DIR = join(process.cwd(), 'app', 'startpage', '_assistant')
const SKILLS_DIR = join(ASSISTANT_DIR, 'skills')
const SYSTEM_MD_PATH = join(ASSISTANT_DIR, 'system.md')
const INITIAL_MD_PATH = join(ASSISTANT_DIR, 'initial.md')
const ACTION_MD_PATH = join(ASSISTANT_DIR, 'action.md')

export async function getSystemMessage(): Promise<string> {
  return fs.readFile(SYSTEM_MD_PATH, 'utf-8')
}

export async function getInitialMessage(): Promise<string> {
  return fs.readFile(INITIAL_MD_PATH, 'utf-8')
}

export async function getActionPrompt(): Promise<string> {
  return fs.readFile(ACTION_MD_PATH, 'utf-8')
}

export async function getSkillTools(skillDir?: string): Promise<ToolSet> {
  const skillTools: ToolSet = {}
  skillDir = skillDir ?? SKILLS_DIR
  const filesInSkillDir = await fs.readdir(skillDir, { withFileTypes: true })
  const dirs = filesInSkillDir.filter(f => !f.name.startsWith('.') && f.isDirectory())
  for (const dir of dirs) {
    const skillPath = join(skillDir, dir.name)
    const skill = await loadSkillTool(skillPath)
    if (!skill) continue
    skillTools[`load_skill_${skill.name}`] = tool({
      description: skill.description,
      inputSchema: z.object({}),
      execute: skill.execute,
    })
  }
  logger.debug(`Loaded ${Object.keys(skillTools).length.toString()} skill tools from ${skillDir}`)
  return skillTools
}

async function loadSkillTool(skillDirPath: string): Promise<ParsedSkill | undefined> {
  const metadata = await parseMetadata(skillDirPath)
  if (!metadata) return undefined

  logger.debug(`Loading skill from ${skillDirPath}`)
  return {
    name: metadata.name,
    description: metadata.description,
    execute: () => loadSkill(metadata.name, skillDirPath),
  }
}

async function parseMetadata(skillDirPath: string): Promise<{ name: string, description: string } | undefined> {
  const files = await fs.readdir(skillDirPath)
  const skillFile = files.find(f => f.toLowerCase() === 'skill.md')
  if (!skillFile) {
    logger.warn(`Skill directory ${skillDirPath} does not contain SKILL.md, skipping`)
    return undefined
  }
  const skillFilePath = join(skillDirPath, skillFile)
  const content = (await fs.readFile(skillFilePath, 'utf-8'))

  const metadata = /---\r?\n([\s\S]*?)\r?\n[^\S\r\n]*---/.exec(content)
  if (!metadata) {
    logger.warn(`Skill file ${skillFilePath} has invalid frontmatter, metadata is missing`)
    return undefined
  }
  const frontmatter: Record<string, string> = {}
  for (const line of metadata[1].split(/\r?\n/)) {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim()
      const value = line.slice(colonIndex + 1).trim()
      frontmatter[key] = value
    }
  }

  if (!frontmatter.name) {
    logger.warn(`Skill file ${skillFilePath} has missing name, skipping`)
    return undefined
  }
  if (!frontmatter.description) {
    logger.warn(`Skill file ${skillFilePath} has missing description, skipping`)
    return undefined
  }
  return { name: frontmatter.name, description: frontmatter.description }
}

async function loadSkill(name: string, skillDirPath: string): Promise<string> {
  logger.debug(`Loading skill ${name} from ${skillDirPath}`)
  const files = await fs.readdir(skillDirPath)
  const fileContents: Record<string, string> = {}
  for (const file of files) {
    const filePath = join(skillDirPath, file)
    const content = await fs.readFile(filePath, 'utf-8')
    fileContents[file] = content
  }
  return `These are the instructions for the skill ${name}. 
  The main file is SKILL.MD, it contains the description and instructions for the skill. 
  The other files in the skill directory are additional resources that may be needed to execute the skill. 
  The contents of the files are as follows:
  
  ${JSON.stringify(fileContents, null, 2)}`
}

interface ParsedSkill {
  name: string
  description: string
  execute: () => Promise<string>
}
