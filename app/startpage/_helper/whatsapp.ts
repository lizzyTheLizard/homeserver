import { Chat, Contact, LidMapping, Message } from '../_data/Chat'

export function getChatName(chat: Chat, contacts: Contact[], lidMappings: LidMapping[]): string {
  if (chat.name) return chat.name
  if (chat.is_group) {
    console.warn('Group chat without name found: ', chat)
    return 'Unnamed group'
  }
  return getContactNameById(chat.id, contacts, lidMappings)
}

export function getSenderName(message: Message, contacts: Contact[], lidMappings: LidMapping[]): string | undefined {
  if (!message.sender_id) return undefined
  return getContactNameById(message.sender_id, contacts, lidMappings)
}

function getContactNameById(id: string, contacts: Contact[], lidMappings: LidMapping[]): string {
  const contact = contacts.find(c => c.id === id)
  if (contact) {
    if (!contact.name.endsWith('@lid')) return contact.name
  }
  if ((id.endsWith('@lid'))) {
    const lidMapping = lidMappings.find(lm => lm.lid === id)
    if (!lidMapping) {
      return 'Unknown contact'
    }
    return whatsAppNameToPhomeNumber(lidMapping.pn)
  }
  return whatsAppNameToPhomeNumber(id)
}

function whatsAppNameToPhomeNumber(whatsappid: string): string {
  // Format the number as +<country code> <area code> <local number>
  const match = /^(41)(\d{2})(\d{3})(\d{2})(\d{2})@s\.whatsapp\.net$/.exec(whatsappid)
  if (match) {
    return `+${match[1]} ${match[2]} ${match[3]} ${match[4]} ${match[5]}`
  }
  if (whatsappid.endsWith('@s.whatsapp.net')) {
    return `+${whatsappid.slice(0, -15)}`
  }
  console.warn('Unknown WhatsApp ID format: ', whatsappid)
  return whatsappid
}
