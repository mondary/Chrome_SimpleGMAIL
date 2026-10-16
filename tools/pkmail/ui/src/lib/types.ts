export interface Account {
  id: string
  name: string
  email: string
}

export interface Envelope {
  id: string
  subject: string
  from: { name: string; addr: string }[]
  to?: { name: string; addr: string }[]
  date: string
  flags: string[]
  hasAttachment?: boolean
  snippet?: string
}

export interface Message extends Envelope {
  text?: string
  html?: string
  attachments?: Attachment[]
}

export interface Folder {
  id: string
  name: string
  total: number
  unseen: number
}

export interface Attachment {
  id: string
  filename: string
  size: number
  mime: string
}
