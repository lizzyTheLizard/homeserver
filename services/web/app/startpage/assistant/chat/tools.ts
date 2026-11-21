import type { ToolSet } from 'ai'
import type { UserSession } from '@/app/shared/auth/session'
import { logger } from '@/app/shared/logger'
import createGeolocationTools from '../_tools/geolocation-tools'
import createMicrosoftCalendarTools from '../_tools/microsoft-calendar-tools'
import createMicrosoftMailTools from '../_tools/microsoft-mail-tools'
import createMicrosoftTodoTools from '../_tools/microsoft-todo-tools'
import createSkillsTools from '../_tools/skills-tools'
import createWeatherTools from '../_tools/weather-tools'
import createWhatsappTools from '../_tools/whatsapp-tools'

const TOOL_FACTORIES: ((user: UserSession) => ToolSet)[] = [
  createGeolocationTools,
  createMicrosoftCalendarTools,
  createMicrosoftMailTools,
  createMicrosoftTodoTools,
  createSkillsTools,
  createWeatherTools,
  createWhatsappTools,
]

export function getTools(user: UserSession): Promise<ToolSet> {
  const allTools: ToolSet = {}
  for (const createTools of TOOL_FACTORIES) Object.assign(allTools, createTools(user))
  logger.debug(`Loaded ${Object.keys(allTools).length.toString()} tools`)
  return Promise.resolve(allTools)
}
