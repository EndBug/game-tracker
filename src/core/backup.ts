import path from 'path'
import fs from 'fs'
import { WebhookClient } from 'discord.js-light'
import { provider } from '../utils/provider'

const localBackupFN = path.join(__dirname, '../../data/settings.json')

export async function uploadBackup(reason: string) {
  console.debug('[backup] Uploading backup...')
  const [id, token] = process.env.BACKUP_WEBHOOK?.split('/')?.slice(-2) || []

  const webhook = new WebhookClient({ id, token })

  await saveLocalBackup()

  return webhook
    .send({
      content: `${reason} - ${new Date()}`,
      files: [
        {
          attachment: localBackupFN,
          name: `database-backup-${new Date().toISOString()}.json`
        }
      ]
    })
    .then(() => console.debug('[Backup] Backup successfully uploaded.'))
    .catch((e) => {
      console.error(
        '[backup] There has bene an issue while uploading the backup:'
      )
      console.error(e)
    })
}

async function saveLocalBackup() {
  const db = await provider.getDatabase()
  fs.writeFileSync(localBackupFN, JSON.stringify(db))
}
