import { Chat, Contact, Message } from '../../_data/Chat'

export function getChatName(chat: Chat, contacts: Contact[]): string {
  if (chat.name) return chat.name
  if (chat.is_group) {
    console.warn('Group chat without name found: ', chat)
    return 'Unnamed group'
  }
  return getContactNameById(chat.id, contacts)
}

export function getSenderName(message: Message, contacts: Contact[]): string | undefined {
  if (!message.sender_id) return undefined
  return getContactNameById(message.sender_id, contacts)
}

function getContactNameById(id: string, contacts: Contact[]): string {
  if (id.endsWith('@lid')) {
    const contact = contacts.find(c => c.lid === id)
    if (contact?.name) return contact.name
    if (contact?.pn) return whatsAppNameToPhomeNumber(contact.pn)
    return 'Unknown contact'
  }
  else {
    const contact = contacts.find(c => c.pn === id)
    if (contact?.name) return contact.name
    return whatsAppNameToPhomeNumber(id)
  }
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
