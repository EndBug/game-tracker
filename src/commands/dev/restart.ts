import { writeFileSync } from 'fs'
import { join as path } from 'path'
import { Message } from 'discord.js'

import { owner } from '../../core/app'
import * as backup from '../../core/backup'
import { Command } from '../../utils/command'
export default class RestartCMD extends Command {
  constructor() {
    super({
      name: 'restart',
      aliases: ['rs'],
      description:
        'Makes a backup of the database (if backup is available) and restarts the bot.',
      guildOnly: false,
      args: [
        {
          key: 'force',
          prompt: 'Whether you want to force the shutdown.',
          parse: (str) => Boolean(str),
          default: false
        }
      ]
    })
  }

  async run(msg: Message, [force]: [boolean]) {
    if (backup.available) {
      let res = await msg.channel.send('Saving a backup...')
      const b = await backup.upload('Restart').catch(console.error)

      if (res instanceof Array) res = res[0]

      if (b instanceof Error) {
        if (!force)
          return res.edit(
            `There has been an error during the backup:\n\`\`\`\n${b}\n\`\`\``
          )
        else
          await res.edit(
            `There has been an error during the backup:\n\`\`\`\n${b}\n\`\`\`\nForced restart will happen in moments.`
          )
      } else
        await res.edit(
          'Backup successfully saved :white_check_mark:\nThe bot will restart in moments.'
        )
    } else await msg.channel.send('nThe bot will restart in moments.')

    writeFileSync(
      path(__dirname, '../../utils/reloadme.json'),
      JSON.stringify({ date: new Date() })
    )
  }

  hasPermission(msg: Message) {
    if (msg.author.id == owner.id) return true
    else return 'This command can only be executed by the bot owner.'
  }
}
