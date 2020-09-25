import { CronJob } from 'cron'
import { available as backupAvailable, upload } from '../core/backup'
import { client, owner } from '../core/app'
import { writeFileSync } from 'fs'
import { join as path } from 'path'

// Restart the bot every day at 04:30
export const job = new CronJob('25 4 * * *', () => {
  client.emit('warn', '[rs] The bot will restart in 5 minutes.')

  setTimeout(async () => {
    if (!job.running) {
      const msg = 'Client stopped from restarting.'
      client.emit('warn', `[rs] ${msg}`)
      return owner.send(msg)
    }

    let ok = true
    client.emit('debug', '[rs] Scheduled restart triggered.')
    try {
      if (backupAvailable)
        await upload('Restart')
    } catch (error) {
      ok = false
      client.emit('error', new Error('[rs] Backup unsuccessful, bot not restarted.'))
      await owner.send(`There has been an error during the backup for a scheduled restart.\n\`\`\`\n${error}\n\`\`\`\nThe bot is not being rebooted.`, { split: true })
    }

    if (ok)
      writeFileSync(path(__dirname, '../utils/reloadme.json'), JSON.stringify({ date: new Date() }))
  }, 5 * 60 * 1000)
})

// THIS MODULE IS TEMPORARILY DISABLED
// This is to test the performance improvements from discord.js-light, which should reduce the need for reloads.
// job.start()
