import { UserSession } from '@/app/shared/auth/auth'
import { InitialContext } from './assistant'
import { shortWeatherOverview } from '../_external/openmeteo'
import { getLocationDescription } from '../_external/openstreetmap'
import { getWAFasade } from '../_external/whatsapp'
import { getInboxCount } from '../_external/microsoft-mail'
import { getTodoCount } from '../_external/microsoft-todo'
import { ModelMessage } from 'ai'
import { send } from '../_external/deepseek'
import fs from 'fs'
import { join } from 'path'

const ASSISTANT_DIR = join(process.cwd(), 'app', 'startpage', '_assistant')
const initialMessage = fs.readFileSync(join(ASSISTANT_DIR, 'initial.md'), 'utf-8')
const systemMessage = fs.readFileSync(join(ASSISTANT_DIR, 'system.md'), 'utf-8')

// TODO: Totally change this file when reworking the initial prompt

export async function generateInitialMessages(user: UserSession, initialContext: InitialContext): Promise<{ messages: ModelMessage[], actions: string[] }> {
  const context = {
    time: new Date().toLocaleString(),
    location: initialContext.location,
    locationDescription: await getLocationDescription(initialContext.location),
    weather: await shortWeatherOverview(initialContext.location.lat, initialContext.location.lon),
    unarchivedWhatsAppChats: (await getWAFasade(user)).getChats().filter(c => !c.archived).sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp),
    outlook: { inboxCount: await getInboxCount(user) },
    todo: await getTodoCount(user),
  }
  const instructions = `${systemMessage}\n\nThe current context is ${JSON.stringify(context)}`
  const messages = [{ role: 'system', content: instructions }, { role: 'user', content: initialMessage }] satisfies ModelMessage[]
  await send({ messages })
  const actions: string[] = []
  if (context.unarchivedWhatsAppChats.length > 0) actions.push('Get WhatsApp Overview')
  if ((context.outlook.inboxCount.focusedUnread + context.outlook.inboxCount.otherUnread) > 0) actions.push('Get Outlook Overview')
  actions.push('Get Todays Weather Details', 'Get Tomorrow\'s Weather Details', 'Get a Weekly Weather Forecast')
  return { messages, actions }
}
