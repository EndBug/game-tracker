import fs from 'fs'
import path from 'path'
import { Message } from 'discord.js-light'

import { owner } from '../../core/app'
import { Command } from '../../utils/command'
import { uploadBackup } from '../../automation/backup'
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
    const res = await msg.channel.send('Saving a backup...')
    const b = await uploadBackup('Restart').catch((e) => {
      console.error(e)
      return e instanceof Error ? e : Error(e)
    })

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

    fs.writeFileSync(
      path.join(__dirname, '../../utils/reloadme.json'),
      JSON.stringify({ date: new Date() })
    )
  }

  hasPermission(msg: Message) {
    if (msg.author.id == owner.id) return true
    else return 'This command can only be executed by the bot owner.'
  }
}
