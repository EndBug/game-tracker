import { CronJob } from 'cron'
import { available as backupAvailable, upload } from '../core/backup'
import { client, owner } from '../core/app'
import { writeFileSync } from 'fs'
import { join as path } from 'path'

// Restart the bot every day at 0 4:30
export const job = new CronJob('25 4 * * *', () => {
  client.emit('warn', 'The bot will restart in 5 minutes.')

  setTimeout(async () => {
    if (!job.running) {
      const msg = 'Client stopped from rebooting.'
      client.emit('warn', msg)
      owner.send(msg)
    }

    let ok = true
    try {
      if (backupAvailable)
        await upload('Restart')
    } catch (error) {
      ok = false
      owner.send(`There has been an error during the backup for a scheduled reboot.\n\`\`\`\n${error}\n\`\`\`\nThe bot is not being rebooted.`, { split: true })
    }

    if (ok)
      writeFileSync(path(__dirname, '../utils/reloadme.json'), JSON.stringify({ date: new Date() }))
  }, 5 * 60 * 1000)
})

job.start()
