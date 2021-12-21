import path from 'path'
import fs from 'fs'
import { WebhookClient } from 'discord.js-light'
import { provider } from '../utils/provider'

export const job = setInterval(() => uploadBackup(), 25 * 60 * 60 * 1000)
const localBackupFN = path.join(__dirname, '../../data/settings.json')

export async function uploadBackup(reason?: string) {
  const webhook = new WebhookClient({
    url: process.env.BACKUP_WEBHOOK
  })

  await saveLocalBackup()

  return webhook.send({
    content: (reason ? `${reason} - ` : '') + new Date(),
    files: [localBackupFN]
  })
}

async function saveLocalBackup() {
  const db = await provider.getDatabase()
  fs.writeFileSync(localBackupFN, JSON.stringify(db))
}
