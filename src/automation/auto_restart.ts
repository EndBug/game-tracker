import { CronJob } from 'cron'
import { writeFileSync } from 'fs'
import { join as path } from 'path'

export const job = new CronJob('0 18 * * 1', () => {
  writeFileSync(
    path(__dirname, '../utils/reloadme.json'),
    JSON.stringify({ date: new Date() })
  )
})
job.start()
