import { type ToolSet, tool } from 'ai';
import fs from 'fs'
import { join } from 'path'
import { logger } from '../logger'
import z from 'zod'

const SKILLS_DIR = join(__dirname, '..', 'skills')

export default function getTools(): ToolSet {
  return getSkillTools(SKILLS_DIR)
}

export function getSkillTools(skillDir: string): ToolSet {
  const skillTools: ToolSet = {},
   filesInSkillDir = fs.readdirSync(skillDir, { withFileTypes: true }),
   dirs = filesInSkillDir.filter(f => !f.name.startsWith('.') && f.isDirectory())
  for (const dir of dirs) {
    const skillPath = join(skillDir, dir.name),
     skill = loadSkillTool(skillPath)
    if (!skill) {continue}
    skillTools[`load_skill_${skill.name}`] = tool({
      description: skill.description,
      execute: skill.execute,
      inputSchema: z.object({}),
    })
  }
  logger.debug(`Loaded skills ${Object.keys(skillTools).map(s => s.substring(11)).join(', ')} from ${skillDir}`)
  return skillTools
}

function loadSkillTool(skillDirPath: string): ParsedSkill | undefined {
  const metadata = parseMetadata(skillDirPath)
  if (!metadata) {return undefined}

  return {
    description: metadata.description,
    execute: () => loadSkill(metadata.name, skillDirPath),
    name: metadata.name,
  }
}

function parseMetadata(skillDirPath: string): { name: string, description: string } | undefined {
  const files = fs.readdirSync(skillDirPath),
   skillFile = files.find(f => f.toLowerCase() === 'skill.md')
  if (!skillFile) {
    logger.warn(`Skill directory ${skillDirPath} does not contain SKILL.md, skipping`)
    return undefined
  }
  const skillFilePath = join(skillDirPath, skillFile),
   content = fs.readFileSync(skillFilePath, 'utf-8'),

   metadata = /---\r?\n([\s\S]*?)\r?\n[^\S\r\n]*---/.exec(content)
  if (!metadata) {
    logger.warn(`Skill file ${skillFilePath} has invalid frontmatter, metadata is missing`)
    return undefined
  }
  const frontmatter: Record<string, string> = {}
  for (const line of metadata[1].split(/\r?\n/)) {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim(),
       value = line.slice(colonIndex + 1).trim()
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
  return { description: frontmatter.description, name: frontmatter.name }
}

async function loadSkill(name: string, skillDirPath: string): Promise<string> {
  const files = await fs.promises.readdir(skillDirPath),
   fileContents: Record<string, string> = {}
  for (const file of files) {
    const filePath = join(skillDirPath, file),
     content = await fs.promises.readFile(filePath, 'utf-8')
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
