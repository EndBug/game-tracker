import { owner } from '../../core/app'
import { Command } from '../../utils/command'
import { Message } from 'discord.js-light'
import { uploadBackup } from '../../automation/backup'

export default class OffCMD extends Command {
  constructor() {
    super({
      name: 'off',
      aliases: ['shutdown'],
      description:
        'Makes a backup of the database (if backup is available) and turns off the bot.',
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
    const b = await uploadBackup('Shutdown').catch((e) => {
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
          `There has been an error during the backup:\n\`\`\`\n${b}\n\`\`\`\nForced shutdown will happen in moments.`
        )
    } else
      await res.edit(
        'Backup successfully saved :white_check_mark:\nThe bot will shut down in moments.'
      )

    this.client.destroy()
    process.exit()
  }

  hasPermission(msg: Message) {
    if (msg.author.id == owner.id) return true
    else return 'This command can only be executed by the bot owner.'
  }
}
