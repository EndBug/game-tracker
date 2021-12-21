import { Message } from 'discord.js-light'
import { owner, roles } from '../../core/app'
import { Command } from '../../utils/command'
import { uploadBackup } from '../../automation/backup'

export default class BackupCMD extends Command {
  constructor() {
    super({
      name: 'backup',
      aliases: ['upload'],
      description: 'Forces the bot to backup the settings database',
      details: 'One backup is issued after every crash.',
      guildOnly: true
    })
  }

  async run(msg: Message) {
    const res = await msg.channel.send('Uploading backup...')

    return uploadBackup('Manual')
      .then(() => res.edit('Backup uploaded :white_check_mark:'))
      .catch((err) =>
        res.edit(`Error while uploading backup:\n\`\`\`\n${err}\n\`\`\``)
      )
  }

  hasPermission(msg: Message) {
    if (msg.author == owner) return true
    const member = msg.member
    if (member) return member.roles.cache.has(roles.dev.id)
    else
      return "Can't define your permissions, please contact the owner of the server."
  }
}
